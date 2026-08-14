import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const [user, expiringCount] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.equipment.count({
      where: {
        warrantyExpiresAt: { not: null, lte: new Date(Date.now() + 90 * 86_400_000), gte: new Date() },
        status: { not: "RETIRED" },
      },
    }),
  ]);
  if (!user) redirect("/login");
  return (
    <AppShell userName={user.name}>
      {expiringCount > 0 && (
        <Link
          href="/warranty"
          className="block border-b border-warn/30 bg-warn/10 px-7 py-2 text-[13px] text-warn transition hover:bg-warn/15"
        >
          ⚠ {expiringCount} {expiringCount === 1 ? "warranty expires" : "warranties expire"} within 90 days — see the
          warranty report
        </Link>
      )}
      {children}
    </AppShell>
  );
}
