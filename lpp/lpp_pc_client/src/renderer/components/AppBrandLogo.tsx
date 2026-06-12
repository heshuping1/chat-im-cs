import { useId } from "react";

const brandDeepGreen = "#076B4A";
const brandSignalGreen = "#00E676";
const brandMintGlow = "#A8FFD1";
const brandIvoryWhite = "#F5F7EB";
const brandGoldEdge = "#E6C97A";

type AppBrandLogoProps = {
  className?: string;
};

export function AppBrandLogo({ className = "" }: AppBrandLogoProps) {
  const baseId = useId().replace(/:/g, "");
  const gradientId = `${baseId}-appBrandGradient`;
  const glowId = `${baseId}-appBrandGlow`;
  const classes = ["app-brand-logo-mark", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <svg viewBox="0 0 72 72" focusable="false" role="img">
        <defs>
          <linearGradient id={gradientId} x1="14" y1="10" x2="58" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={brandSignalGreen} />
            <stop offset="0.56" stopColor={brandDeepGreen} />
            <stop offset="1" stopColor={brandDeepGreen} />
          </linearGradient>
          <radialGradient id={glowId} cx="22" cy="16" r="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={brandMintGlow} stopOpacity="0.86" />
            <stop offset="0.48" stopColor={brandSignalGreen} stopOpacity="0.18" />
            <stop offset="1" stopColor={brandDeepGreen} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="5" y="5" width="62" height="62" rx="18" fill={`url(#${gradientId})`} />
        <rect x="5" y="5" width="62" height="62" rx="18" fill={`url(#${glowId})`} />
        <rect x="6.1" y="6.1" width="59.8" height="59.8" rx="16.9" fill="none" stroke={brandGoldEdge} strokeOpacity="0.72" strokeWidth="1.3" />
        <rect x="7.3" y="7.3" width="57.4" height="57.4" rx="15.7" fill="none" stroke={brandMintGlow} strokeOpacity="0.62" strokeWidth="1.45" />
        <path
          d="M53 29.2c3.18 8.45-.35 18.7-8.65 23.7-6.75 3.95-14.95 3.6-21.1-.25l-8.2 2.45 1.72-9.03A20.3 20.3 0 0 1 18.15 25.7c5.8-7.02 15.65-9.2 23.88-5.72"
          fill="none"
          stroke={brandIvoryWhite}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5.3"
        />
        <path
          d="M36 25.7c2.02 5.18 5.34 8.5 10.5 10.3-5.16 1.8-8.48 5.12-10.5 10.3-2.02-5.18-5.34-8.5-10.5-10.3 5.16-1.8 8.48-5.12 10.5-10.3Z"
          fill={brandIvoryWhite}
        />
        <path d="M52.2 13.2c1.1 3.1 3.08 5.08 6.1 6.1-3.02 1.02-5 3-6.1 6.1-1.1-3.1-3.08-5.08-6.1-6.1 3.02-1.02 5-3 6.1-6.1Z" fill={brandIvoryWhite} />
      </svg>
    </span>
  );
}
