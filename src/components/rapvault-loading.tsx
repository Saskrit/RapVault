import { BrandWordmark, Logo } from "@/components/logo";

type RapVaultLoadingProps = {
  label?: string;
  fullScreen?: boolean;
  compact?: boolean;
  className?: string;
};

export function RapVaultLoading({
  label = "Loading...",
  fullScreen = false,
  compact = false,
  className = "",
}: RapVaultLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background text-muted ${
        fullScreen ? "min-h-[100dvh]" : "min-h-0 flex-1"
      } ${compact ? "gap-3 py-16" : "gap-4"} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex flex-col items-center ${compact ? "gap-2" : "gap-3"}`}>
        <Logo size={compact ? 40 : 56} href={null} priority />
        <BrandWordmark height={compact ? 16 : 22} href={null} priority />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
