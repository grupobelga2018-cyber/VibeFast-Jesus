import Image from "next/image"
import config from "@/config"

export default function Logo({ className } = {}) {
  const src = config.brand.logoSrc

  if (src) {
    return (
      <Image
        src={src}
        alt={config.brand.logoText}
        width={1024}
        height={1024}
        className={`w-auto rounded-lg object-contain ${className ?? "h-12"}`}
        priority
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-primary text-primary-content ${className ?? "size-7"}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[62%]">
        <path
          d="M3.5 12 H7 L10.5 18 L15.5 6 H20.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
