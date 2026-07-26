import Link from "next/link";
import { Code2, AtSign, BookOpen } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Architecture", href: "#architecture" },
      { label: "Features", href: "#features" },
      { label: "Detection engine", href: "#engine" },
      { label: "Live demo", href: "#demo" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Dashboard", href: "/overview" },
      { label: "Live monitoring", href: "/monitoring" },
      { label: "Threat detection", href: "/threats" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "FAQ", href: "#faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="absolute inset-0 bg-dots opacity-[0.25] mask-fade-b" />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The real-time bidirectional security firewall for AI agents and
              the Model Context Protocol.
            </p>
            <div className="mt-5 flex gap-2">
              {[
                { icon: Code2, href: "#", label: "GitHub" },
                { icon: AtSign, href: "#", label: "Twitter" },
                { icon: BookOpen, href: "#", label: "Docs" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface/50 text-muted transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-subtle sm:flex-row">
          <span>© {new Date().getFullYear()} MCP Guardian. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-allow" />
            </span>
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}
