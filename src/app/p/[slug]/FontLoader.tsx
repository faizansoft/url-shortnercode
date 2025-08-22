"use client";
import { useEffect } from "react";

export default function FontLoader({ href }: { href: string }) {
  useEffect(() => {
    if (!href) return;
    // Avoid duplicate injection
    const id = `gf-${btoa(href).replace(/=/g, "")}`;
    if (document.getElementById(id)) return;

    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(pre1);

    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = 'anonymous';
    document.head.appendChild(pre2);

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);

    return () => {
      // keep font for navigation persistence; do not remove
    };
  }, [href]);
  return null;
}
