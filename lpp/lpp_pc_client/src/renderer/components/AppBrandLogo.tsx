export const appBrandLogoSrc = `${import.meta.env.BASE_URL}brand-logo-icon.png`;

type AppBrandLogoProps = {
  className?: string;
};

export function AppBrandLogo({ className = "" }: AppBrandLogoProps) {
  const classes = ["app-brand-logo-mark", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <img src={appBrandLogoSrc} alt="" draggable={false} />
    </span>
  );
}
