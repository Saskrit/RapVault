import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  size?: number;
  href?: string | null;
  className?: string;
  priority?: boolean;
  /** Prefer PNG for crisp UI; SVG kept in /public for other uses */
  variant?: "png" | "svg";
};

export function Logo({
  size = 40,
  href = "/",
  className = "",
  priority = false,
  variant = "png",
}: LogoProps) {
  const image = (
    <Image
      src={variant === "svg" ? "/logo.svg" : "/logo.png"}
      alt="RapVault"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full object-contain ${className}`}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {image}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0">{image}</span>;
}

type BrandWordmarkProps = {
  height?: number;
  className?: string;
  priority?: boolean;
};

/** Official “RAP VAULT” wordmark asset */
export function BrandWordmark({
  height = 22,
  className = "",
  priority = false,
}: BrandWordmarkProps) {
  const width = Math.round(height * (480 / 120));
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md bg-[#0a0a0a] px-2 py-1 ${className}`}
    >
      <Image
        src="/rvtext.png"
        alt="Rap Vault"
        width={width}
        height={height}
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}
