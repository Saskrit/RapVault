import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  size?: number;
  href?: string | null;
  className?: string;
  priority?: boolean;
};

export function Logo({
  size = 40,
  href = "/",
  className = "",
  priority = false,
}: LogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt="RapVault"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full object-cover ${className}`}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0" aria-label="RapVault home">
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
  href?: string | null;
};

/** Text wordmark (rvtxt.png) — for marketing/auth splash only, not site headers. */
export function BrandWordmark({
  height = 22,
  className = "",
  priority = false,
  href = "/",
}: BrandWordmarkProps) {
  const width = Math.round(height * (1024 / 134));
  const image = (
    <Image
      src="/rvtxt.png"
      alt="Rap Vault"
      width={width}
      height={height}
      priority={priority}
      className="object-contain"
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center ${className}`}
        aria-label="RapVault home"
      >
        {image}
      </Link>
    );
  }

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>{image}</span>
  );
}
