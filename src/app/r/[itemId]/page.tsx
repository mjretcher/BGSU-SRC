import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEVEL_LABEL, STATUS_LABEL, STATUS_TONE, TONE_COLOR } from "@/lib/status";
import { fmtDateTime } from "@/lib/metrics";
import { QuickReport } from "@/components/QuickReport";

export const dynamic = "force-dynamic";

// The scan target for the QR label on each machine.
//
// Every other way into this system assumes a desktop: reporting a fault meant
// walking to a computer, signing in, loading a WebGL floor map or a wide table,
// finding the item and filling a form. The person who notices a broken rower is
// standing at the rower with a phone. This is one screen, reachable in one scan,
// that does the two things that matter there — report it down, or log the fix
// you just made.
//
// Addressed by itemId, not the database id: itemId is the number already
// printed on the asset tag and is @unique, so a label stays correct across
// reseeds and is checkable by eye against the machine.
export default async function ReportPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const decoded = decodeURIComponent(itemId);

  // Staff-only. Sending an unauthenticated scanner to the sign-in page and back
  // keeps every report attributable in the audit trail, which anonymous
  // reporting would give up.
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent(`/r/${itemId}`)}`);

  const equipment = await db.equipment.findUnique({
    where: { itemId: decoded },
    include: { events: { where: { closedAt: null }, take: 1 } },
  });
  if (!equipment) notFound();

  const openEvent = equipment.events[0] ?? null;
  const tone = STATUS_TONE[equipment.status];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <header className="border-b border-line pb-4">
        <p className="font-mono text-[12px] text-[color:var(--text-faint)]">#{equipment.itemId}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-ink">
          {equipment.name}
        </h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          {equipment.brand}
          {equipment.model && <span className="font-mono"> · {equipment.model}</span>}
        </p>
        <p className="mt-0.5 text-[13px] text-[color:var(--text-faint)]">
          {LEVEL_LABEL[equipment.level]} · {equipment.zone}
        </p>
        <p className="mt-3 flex items-center gap-2 text-[15px]" style={{ color: TONE_COLOR[tone] }}>
          <span className="text-lg leading-none">●</span>
          {STATUS_LABEL[equipment.status]}
        </p>
        {openEvent && (
          <p className="mt-1 text-[13px] text-ink-secondary">
            Reported {fmtDateTime(openEvent.openedAt)}
          </p>
        )}
      </header>

      <QuickReport
        equipmentId={equipment.id}
        status={equipment.status}
        openEvent={openEvent && { id: openEvent.id, openedAt: openEvent.openedAt.toISOString() }}
      />

      <footer className="mt-8 border-t border-line pt-4">
        <Link href={`/equipment/${equipment.id}`} className="text-[13px] text-accent">
          Full history and details →
        </Link>
      </footer>
    </main>
  );
}
