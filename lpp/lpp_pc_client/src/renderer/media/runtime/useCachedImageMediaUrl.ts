import { useEffect, useState } from "react";
import { isBrowserNativeUrl } from "../../data/im-message-normalize";
import { getCachedMedia, refreshCachedMedia } from "../../lib/mediaCache";

export function useCachedImageMediaUrl(
  src: string | undefined,
  authToken: string | undefined,
  cacheKey: string | undefined,
) {
  const [cached, setCached] = useState(false);
  const [checkedCache, setCheckedCache] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const shouldFetchBlob = Boolean(src && authToken && cacheKey && !isBrowserNativeUrl(src));

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];

    const showBlob = (blob: Blob | null, fromCache: boolean) => {
      if (!blob?.size) return;
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.push(objectUrl);
      if (!active) return;
      setBlobSrc(objectUrl);
      setCached(fromCache);
      setFailed(false);
    };

    setBlobSrc(null);
    setCached(false);
    setCheckedCache(!src || isBrowserNativeUrl(src) || !cacheKey);
    setFailed(false);

    if (!src || isBrowserNativeUrl(src) || !cacheKey) {
      return () => {
        active = false;
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      };
    }

    getCachedMedia(cacheKey)
      .then((blob) => {
        if (!active) return;
        if (blob?.size) {
          showBlob(blob, true);
        } else if (!shouldFetchBlob) {
          setCheckedCache(true);
        }
      })
      .catch(() => {
        if (active && !shouldFetchBlob) setCheckedCache(true);
      });

    refreshCachedMedia({ key: cacheKey, token: authToken, url: src })
      .then((blob) => {
        if (!active) return;
        if (blob?.size) {
          showBlob(blob, false);
          return;
        }
        if (!shouldFetchBlob) {
          setCheckedCache(true);
          return;
        }
        void forceRefreshCachedImage({
          active: () => active,
          authToken,
          cacheKey,
          setFailed,
          showBlob,
          src,
        });
      })
      .catch(() => {
        if (!active) return;
        if (!shouldFetchBlob) {
          setCheckedCache(true);
          return;
        }
        void forceRefreshCachedImage({
          active: () => active,
          authToken,
          cacheKey,
          setFailed,
          showBlob,
          src,
        });
      });

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [authToken, cacheKey, src, shouldFetchBlob]);

  const loadCachedMedia = () => {
    if (!src) {
      setFailed(true);
      return;
    }
    if (!cacheKey || isBrowserNativeUrl(src)) {
      setFailed(true);
      return;
    }
    void refreshCachedMedia({ force: true, key: cacheKey, token: authToken, url: src })
      .then((blob) => {
        if (!blob?.size) {
          setFailed(true);
          return;
        }
        setBlobSrc((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setCached(false);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  };

  return {
    cached,
    displaySrc: blobSrc ?? (checkedCache && !shouldFetchBlob ? src : ""),
    failed,
    loadCachedMedia,
  };
}

export function imageVisibleSource(
  localFileSrc: string | null,
  imageSrc: string | undefined,
  brokenImageSrc: string | null,
) {
  if (localFileSrc && !sameMediaUrl(localFileSrc, brokenImageSrc)) return localFileSrc;
  if (imageSrc && !sameMediaUrl(imageSrc, brokenImageSrc)) return imageSrc;
  return "";
}

export function sameMediaUrl(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left === right || decodeSafeUrl(left) === decodeSafeUrl(right);
}

async function forceRefreshCachedImage({
  active,
  authToken,
  cacheKey,
  setFailed,
  showBlob,
  src,
}: {
  active: () => boolean;
  authToken?: string;
  cacheKey: string;
  setFailed: (value: boolean) => void;
  showBlob: (blob: Blob | null, fromCache: boolean) => void;
  src: string;
}) {
  try {
    const forcedBlob = await refreshCachedMedia({
      force: true,
      key: cacheKey,
      token: authToken,
      url: src,
    });
    if (!active()) return;
    if (forcedBlob?.size) {
      showBlob(forcedBlob, false);
    } else {
      setFailed(true);
    }
  } catch {
    if (active()) setFailed(true);
  }
}

function decodeSafeUrl(value: string) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}
