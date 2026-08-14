"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MapIcon, TableIcon, ChartIcon, ShieldIcon, ScrollIcon, LogoutIcon, UsersIcon } from "./icons";

const NAV = [
  { href: "/", label: "Facility Map", Icon: MapIcon },
  { href: "/fleet", label: "Fleet", Icon: TableIcon },
  { href: "/reports", label: "Reports", Icon: ChartIcon },
  { href: "/warranty", label: "Warranty", Icon: ShieldIcon },
  { href: "/audit", label: "Audit Trail", Icon: ScrollIcon },
  { href: "/users", label: "Users", Icon: UsersIcon },
];

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[68px] flex-col items-center border-r border-line bg-bg-raised/80 py-5 backdrop-blur">
        <Link href="/" className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
          <span className="font-mono text-sm font-bold tracking-tight text-accent">RC</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-2">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-accent-soft text-accent" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
                {active && (
                  <span className="absolute -left-[13px] h-5 w-[3px] rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
                )}
                <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-3">
          <span
            title={userName}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface text-xs font-medium text-ink-secondary"
          >
            {userName
              .split(/\s+/)
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 pl-[68px]">{children}</div>
    </div>
  );
}
