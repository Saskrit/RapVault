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
      className={`object-contain ${className}`}
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
