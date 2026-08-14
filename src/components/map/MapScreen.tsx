"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { FacilityMap, type MapEquipment } from "./FacilityMap";
import { EquipmentPanel } from "./EquipmentPanel";

export function MapScreen({
  equipment,
  counts,
}: {
  equipment: MapEquipment[];
  counts: { total: number; up: number; warn: number; down: number; flagged: number };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [arrange, setArrange] = useState(false);
  const [local, setLocal] = useState(equipment);
  const [undoStack, setUndoStack] = useState<{ id: string; x: number; y: number; name: string }[]>([]);

  async function persistMove(id: string, x: number, y: number) {
    setLocal((prev) => prev.map((e) => (e.id === id ? { ...e, mapX: x, mapY: y } : e)));
    await fetch(`/api/equipment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapX: x, mapY: y }),
    });
  }

  async function move(id: string, x: number, y: number) {
    const before = local.find((e) => e.id === id);
    if (before) {
      setUndoStack((st) => [...st.slice(-19), { id, x: before.mapX, y: before.mapY, name: before.name }]);
    }
    await persistMove(id, x, y);
  }

  async function undo() {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((st) => st.slice(0, -1));
    await persistMove(last.id, last.x, last.y);
  }

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-line px-7 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Facility Map</h1>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            BGSU Student Recreation Center · live equipment status
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[12px] text-ink-secondary">
            {counts.total} units
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-up/30 bg-up/10 px-3 py-1.5 font-mono text-[12px] text-up">
            ● {counts.up} up
          </span>
          {counts.warn > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-3 py-1.5 font-mono text-[12px] text-warn">
              ● {counts.warn} in repair
            </span>
          )}
          {counts.down > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-down/30 bg-down/10 px-3 py-1.5 font-mono text-[12px] text-down">
              ● {counts.down} down
            </span>
          )}
          {counts.flagged > 0 && (
            <span className="rounded-full border border-down/40 bg-down/10 px-3 py-1.5 font-mono text-[12px] text-down">
              ⚑ {counts.flagged} flagged
            </span>
          )}
          {undoStack.length > 0 && (
            <button
              onClick={undo}
              title={`Move ${undoStack[undoStack.length - 1].name} back`}
              className="rounded-lg border border-line-strong px-3.5 py-1.5 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink"
            >
              ↩ Undo move
            </button>
          )}
          <button
            onClick={() => setArrange((a) => !a)}
            className={`rounded-lg border px-3.5 py-1.5 text-[13px] transition ${
              arrange
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-line-strong text-ink-secondary hover:text-ink"
            }`}
          >
            {arrange ? "Done arranging" : "Arrange pins"}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <FacilityMap
          equipment={local}
          selectedId={selectedId}
          onSelect={setSelectedId}
          arrange={arrange}
          onMove={move}
        />
        <AnimatePresence>
          {selectedId && <EquipmentPanel key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
        </AnimatePresence>
      </div>
    </main>
  );
}
