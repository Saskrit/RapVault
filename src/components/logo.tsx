import Image from "next/image";
import Link from "next/link";

/** Versioned so browsers / SW / CDN pick up the circular mark after past bad caches. */
const MARK_SRC = "/rapvault-mark.png?v=3";
const WORDMARK_SRC = "/rvtxt.png?v=3";

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
      src={MARK_SRC}
      alt="RapVault"
      width={size}
      height={size}
      priority={priority}
      unoptimized
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

/** Text wordmark — shown next to the circular mark in headers. */
export function BrandWordmark({
  height = 22,
  className = "",
  priority = false,
  href = "/",
}: BrandWordmarkProps) {
  const width = Math.round(height * (1024 / 134));
  const image = (
    <Image
      src={WORDMARK_SRC}
      alt="Rap Vault"
      width={width}
      height={height}
      priority={priority}
      unoptimized
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
