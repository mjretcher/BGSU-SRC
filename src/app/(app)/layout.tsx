import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  return <AppShell userName={user.name}>{children}</AppShell>;
}
