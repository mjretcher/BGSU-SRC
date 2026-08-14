"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import type { MapEquipment } from "./FacilityMap";
import type { LevelKey } from "@/data/floorplans";
import { EquipmentPanel } from "./EquipmentPanel";
import { LayersIcon } from "../icons";

const Facility3D = dynamic(() => import("../map3d/Facility3D").then((m) => m.Facility3D), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ink-secondary">Building the facility…</div>
  ),
});

const LEVEL_TABS: { key: LevelKey; label: string }[] = [
  { key: "balcony", label: "Balcony" },
  { key: "entry", label: "Entry Level" },
  { key: "lower2", label: "Lower Level II" },
];

export function MapScreen({
  equipment,
  counts,
}: {
  equipment: MapEquipment[];
  counts: { total: number; up: number; warn: number; down: number; flagged: number };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [arrange, setArrange] = useState(false);
  const [focus, setFocus] = useState<LevelKey | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
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
        <div className="absolute left-6 top-5 z-30 flex items-center gap-2">
          <button
            onClick={() => setFocus(null)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              focus === null
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-line bg-surface/70 text-ink-secondary backdrop-blur hover:text-ink"
            }`}
          >
            <LayersIcon className="h-4 w-4" />
            Full Facility
          </button>
          {LEVEL_TABS.map((l) => (
            <button
              key={l.key}
              onClick={() => setFocus(l.key)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                focus === l.key
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line bg-surface/70 text-ink-secondary backdrop-blur hover:text-ink"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="absolute bottom-5 right-6 z-30 rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-[11px] text-[color:var(--text-faint)] backdrop-blur">
          drag to orbit · scroll to zoom{arrange ? " · drag a machine to move it" : " · click a machine for details"}
        </p>
        <div key={sceneKey} className="absolute inset-0">
          <Facility3D
            onContextLost={() => setSceneKey((k) => k + 1)}
            equipment={local}
            selectedId={selectedId}
            onSelect={setSelectedId}
            arrange={arrange}
            onMove={move}
            focus={focus}
          />
        </div>
        <AnimatePresence>
          {selectedId && <EquipmentPanel key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
        </AnimatePresence>
      </div>
    </main>
  );
}
