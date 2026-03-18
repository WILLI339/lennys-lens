"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Overview" },
    { href: "/topics", label: "Topics" },
    { href: "/graph", label: "Graph" },
    { href: "/search", label: "Search" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link href="/" className="mr-8 flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Lenny&apos;s Lens</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"))
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
