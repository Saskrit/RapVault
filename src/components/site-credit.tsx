const PORTFOLIO_URL = "https://saskritbhattarai.com.np/";

type SiteCreditProps = {
  className?: string;
};

export function SiteCredit({ className = "" }: SiteCreditProps) {
  return (
    <p
      className={`text-center text-xs leading-relaxed text-muted sm:text-sm ${className}`}
    >
      This website is made by{" "}
      <span className="font-medium text-foreground">Saskrit Bhattarai</span>{" "}
      <a
        href={PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold tracking-wide text-foreground transition hover:border-accent hover:text-accent sm:text-xs"
      >
        Portfolio Website
      </a>
    </p>
  );
}
