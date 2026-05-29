export type DesktopMediaKind = "image" | "video" | "file";

export type DesktopMediaActionPayload = {
  url: string;
  fileName: string;
  kind: DesktopMediaKind;
  authToken?: string;
  accountId?: string;
  conversationId?: string;
};

export async function downloadDesktopMedia(payload: DesktopMediaActionPayload) {
  const fileName = safeDesktopMediaFileName(payload.fileName);
  if (!/^(blob:|file:)/i.test(payload.url) && window.desktopApi?.cacheMediaFile) {
    await window.desktopApi.cacheMediaFile({ ...payload, fileName });
    return;
  }
  if (/^(blob:|data:|file:)/i.test(payload.url)) {
    triggerDownload(payload.url, fileName);
    return;
  }
  try {
    await downloadAuthenticatedMediaBlob(payload.url, fileName, payload.authToken);
  } catch {
    triggerDownload(payload.url, fileName);
  }
}

export async function saveDesktopMediaAs(payload: DesktopMediaActionPayload) {
  assertRemoteReady(payload.url, "\u8fd9\u6761\u672c\u5730\u4e34\u65f6\u6587\u4ef6\u6682\u4e0d\u652f\u6301\u53e6\u5b58\u4e3a\uff0c\u8bf7\u5148\u53d1\u9001\u5b8c\u6210\u540e\u518d\u64cd\u4f5c");
  const fileName = safeDesktopMediaFileName(payload.fileName);
  if (window.desktopApi?.saveMediaAs) {
    return window.desktopApi.saveMediaAs({ ...payload, fileName });
  }
  await downloadAuthenticatedMediaBlob(payload.url, fileName, payload.authToken);
  return fileName;
}

export async function revealDesktopMediaInFolder(payload: DesktopMediaActionPayload) {
  assertRemoteReady(payload.url, "\u8fd9\u6761\u672c\u5730\u4e34\u65f6\u6587\u4ef6\u6682\u4e0d\u652f\u6301\u663e\u793a\u4f4d\u7f6e\uff0c\u8bf7\u5148\u53d1\u9001\u5b8c\u6210\u540e\u518d\u64cd\u4f5c");
  const fileName = safeDesktopMediaFileName(payload.fileName);
  if (window.desktopApi?.revealMediaInFolder) {
    return window.desktopApi.revealMediaInFolder({ ...payload, fileName });
  }
  if (window.desktopApi?.cacheMediaFile && window.desktopApi?.openFile) {
    const cached = await window.desktopApi.cacheMediaFile({ ...payload, fileName });
    await window.desktopApi.openFile(parentDirectory(cached.filePath));
    return cached.filePath;
  }
  throw new Error("\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u663e\u793a\u6587\u4ef6\u4f4d\u7f6e");
}

export async function copyDesktopMediaFile(payload: DesktopMediaActionPayload) {
  assertRemoteReady(payload.url, "\u8fd9\u6761\u672c\u5730\u4e34\u65f6\u6587\u4ef6\u6682\u4e0d\u652f\u6301\u590d\u5236\uff0c\u8bf7\u5148\u53d1\u9001\u5b8c\u6210\u540e\u518d\u64cd\u4f5c");
  const fileName = safeDesktopMediaFileName(payload.fileName);
  const nextPayload = { ...payload, fileName };
  if (window.desktopApi?.copyMediaFile) {
    return window.desktopApi.copyMediaFile(nextPayload);
  }
  if (window.desktopApi?.cacheMediaFile) {
    const cached = await window.desktopApi.cacheMediaFile(nextPayload);
    if (window.desktopApi?.copyFilePath) {
      await window.desktopApi.copyFilePath(cached.filePath);
    } else {
      await navigator.clipboard.writeText(cached.filePath);
    }
    return cached.filePath;
  }
  throw new Error("PC \u684c\u9762\u80fd\u529b\u5c1a\u672a\u5c31\u7eea\uff0c\u8bf7\u91cd\u542f PC \u5ba2\u6237\u7aef\u540e\u518d\u8bd5");
}

export async function openDesktopMediaFile(payload: DesktopMediaActionPayload) {
  assertRemoteReady(payload.url, "\u8fd9\u6761\u672c\u5730\u4e34\u65f6\u6587\u4ef6\u6682\u4e0d\u652f\u6301\u6253\u5f00\uff0c\u8bf7\u5148\u53d1\u9001\u5b8c\u6210\u540e\u518d\u64cd\u4f5c");
  const fileName = safeDesktopMediaFileName(payload.fileName);
  const nextPayload = { ...payload, fileName };
  if (window.desktopApi?.openMediaFile) {
    return window.desktopApi.openMediaFile(nextPayload);
  }
  if (window.desktopApi?.cacheMediaFile && window.desktopApi?.openFile) {
    const cached = await window.desktopApi.cacheMediaFile(nextPayload);
    await window.desktopApi.openFile(cached.filePath);
    return cached.filePath;
  }
  throw new Error("\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u6253\u5f00\u6587\u4ef6");
}

export async function editDesktopMediaFile(payload: DesktopMediaActionPayload) {
  assertRemoteReady(payload.url, "\u8fd9\u6761\u672c\u5730\u4e34\u65f6\u6587\u4ef6\u6682\u4e0d\u652f\u6301\u7f16\u8f91\uff0c\u8bf7\u5148\u53d1\u9001\u5b8c\u6210\u540e\u518d\u64cd\u4f5c");
  const fileName = safeDesktopMediaFileName(payload.fileName);
  const nextPayload = { ...payload, fileName };
  if (window.desktopApi?.editMediaFile) {
    return window.desktopApi.editMediaFile(nextPayload);
  }
  return openDesktopMediaFile(nextPayload);
}

export async function copyDesktopImage(
  payload: Omit<DesktopMediaActionPayload, "kind"> & { kind?: "image" },
) {
  if (!/^(blob:|data:)/i.test(payload.url) && window.desktopApi?.copyImageFromUrl) {
    await window.desktopApi.copyImageFromUrl(payload);
    return;
  }
  const pngBlob = await imageUrlToPngBlob(payload.url, payload.authToken);
  const ClipboardItemCtor = window.ClipboardItem;
  if (!navigator.clipboard?.write || !ClipboardItemCtor) {
    throw new Error("\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u590d\u5236\u56fe\u7247");
  }
  await navigator.clipboard.write([
    new ClipboardItemCtor({ "image/png": pngBlob }),
  ]);
}

export function revealInFolderLabel() {
  return isMacPlatform() ? "\u5728 Finder \u4e2d\u663e\u793a" : "\u5728\u6587\u4ef6\u5939\u4e2d\u663e\u793a";
}

export function safeDesktopMediaFileName(value: string) {
  const sanitized = value.trim().replace(/[\\/:*?"<>|]/g, "_");
  return sanitized || "lpp-media";
}

function assertRemoteReady(url: string, message: string) {
  if (/^blob:/i.test(url)) throw new Error(message);
}

function isMacPlatform() {
  return /mac/i.test(navigator.platform);
}

function parentDirectory(filePath: string) {
  const normalized = filePath.trim();
  const parent = normalized.replace(/[\\/][^\\/]*$/, "");
  return parent || normalized;
}

async function downloadAuthenticatedMediaBlob(
  url: string,
  fileName: string,
  authToken?: string,
) {
  const response = await fetch(url, {
    headers: authToken
      ? {
          Accept: "application/octet-stream,*/*",
          Authorization: `Bearer ${authToken}`,
          "X-Access-Token": authToken,
          "X-Tenant-Token": authToken,
        }
      : undefined,
  });
  const blob = await response.blob();
  if (!response.ok || blob.type.includes("json")) {
    const text = await blob.text().catch(() => "");
    const message = jsonErrorMessage(text) || `\u6587\u4ef6\u4e0b\u8f7d\u5931\u8d25\uff1aHTTP ${response.status}`;
    throw new Error(message);
  }
  const objectUrl = URL.createObjectURL(blob);
  triggerDownload(objectUrl, fileName);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
}

async function imageUrlToPngBlob(url: string, authToken?: string) {
  const response = await fetch(url, {
    headers:
      authToken && !/^(blob:|data:)/i.test(url)
        ? { Authorization: `Bearer ${authToken}` }
        : undefined,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const sourceBlob = await response.blob();
  if (sourceBlob.type === "image/png") return sourceBlob;
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("\u65e0\u6cd5\u521b\u5efa\u56fe\u7247\u753b\u5e03");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("\u56fe\u7247\u8f6c\u6362\u5931\u8d25"));
    }, "image/png");
  });
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function jsonErrorMessage(text: string) {
  if (!text.trim()) return undefined;
  try {
    const payload = JSON.parse(text) as { code?: string; message?: string };
    if (payload.code === "AUTH_REQUIRED") {
      return "\u6587\u4ef6\u4e0b\u8f7d\u9700\u8981\u767b\u5f55\u8ba4\u8bc1\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55\u540e\u518d\u8bd5";
    }
    return payload.message || payload.code;
  } catch {
    return undefined;
  }
}
