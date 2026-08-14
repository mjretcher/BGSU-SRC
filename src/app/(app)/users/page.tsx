import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { UserManager } from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return (
    <main className="mx-auto max-w-3xl p-7">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Users</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Everyone has identical permissions. Passwords you set or generate are shown once — pass them on securely.
          {" "}<Link href="/audit" className="text-[color:var(--text-faint)] underline-offset-2 hover:text-accent hover:underline">Audit trail →</Link>
        </p>
      </header>
      <UserManager
        selfId={session!.userId}
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      />
    </main>
  );
}
