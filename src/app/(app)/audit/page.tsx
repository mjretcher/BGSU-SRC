import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, string> = {
  "auth.login_success": "text-up",
  "auth.login_failed": "text-down",
  "auth.login_rate_limited": "text-down",
  "downtime.opened": "text-down",
  "downtime.closed": "text-up",
  "downtime.closed_retired": "text-warn",
  "downtime.status_changed": "text-warn",
  "alert.warranty": "text-warn",
  "alert.downtime_flag": "text-down",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const perPage = 100;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    db.auditLog.count(),
  ]);
  const pages = Math.ceil(total / perPage);

  return (
    <main className="mx-auto max-w-6xl p-7">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Audit Trail</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Every status change, edit, login, and alert · {total.toLocaleString()} entries
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[800px] bg-surface/50 text-[13px]">
          <thead className="border-b border-line bg-bg-raised/60 text-left text-[11px] uppercase tracking-wider text-[color:var(--text-faint)]">
            <tr>
              <th className="px-3 py-2.5">When</th>
              <th className="px-3 py-2.5">Actor</th>
              <th className="px-3 py-2.5">Action</th>
              <th className="px-3 py-2.5">Target</th>
              <th className="px-3 py-2.5">Change</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-line/50 align-top last:border-0 hover:bg-surface-hover">
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-ink-secondary">
                  {fmtDateTime(l.createdAt)}
                </td>
                <td className="px-3 py-2.5 text-ink">{l.actorEmail}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 font-mono text-[12px] ${ACTION_TONE[l.action] ?? "text-ink-secondary"}`}>
                  {l.action}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-secondary">
                  {l.targetType}
                  {l.targetId && <span className="text-[color:var(--text-faint)]"> {l.targetId.slice(0, 8)}…</span>}
                </td>
                <td className="max-w-md px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink-secondary">
                  {l.before !== null && <div className="truncate">− {JSON.stringify(l.before)}</div>}
                  {l.after !== null && <div className="truncate">+ {JSON.stringify(l.after)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center gap-2 text-[13px]">
          {page > 1 && (
            <a href={`?page=${page - 1}`} className="rounded-lg border border-line-strong px-3 py-1.5 text-ink-secondary hover:text-ink">
              ← Newer
            </a>
          )}
          <span className="text-[color:var(--text-faint)]">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <a href={`?page=${page + 1}`} className="rounded-lg border border-line-strong px-3 py-1.5 text-ink-secondary hover:text-ink">
              Older →
            </a>
          )}
        </nav>
      )}
    </main>
  );
}
