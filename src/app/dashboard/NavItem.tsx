"use client";
import Link from "next/link";
import type React from "react";
import { usePathname } from "next/navigation";

export default function NavItem({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-item ${active ? "nav-item-active" : ""}`}
    >
      {icon ? (
        <span
          aria-hidden
          className={
            active
              ? "text-[var(--foreground)]"
              : "text-[color-mix(in_oklab,var(--foreground)_80%,#475569)]"
          }
        >
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </Link>
  );
}
