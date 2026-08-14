"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { BuildingLevel, EquipmentStatus, IconCategory } from "@/generated/prisma/enums";
import { projectPin, unprojectPin, CROP, type LevelKey } from "@/data/floorplans";
import { LevelSvg } from "./LevelSvg";
import { CATEGORY_ICON, LayersIcon } from "../icons";
import { STATUS_SHORT, STATUS_TONE, TONE_COLOR, TONE_GLOW, type StatusTone } from "@/lib/status";

export interface MapEquipment {
  id: string;
  itemId: string;
  name: string;
  brand: string;
  level: BuildingLevel;
  mapX: number;
  mapY: number;
  iconCategory: IconCategory;
  status: EquipmentStatus;
  flagged: boolean;
}

// When a level is focused, zoom the floor into its equipment zone; pins are
// counter-scaled so they keep constant screen size and gain breathing room.
const ZONE_FOCUS: Record<LevelKey, { s: number; dx: number; dy: number }> = {
  entry: { s: 2.2, dx: -7, dy: -51.9 },
  balcony: { s: 2.2, dx: 2, dy: -17.8 },
  lower2: { s: 2.4, dx: -71.5, dy: 15.4 },
};

const LEVELS: { key: LevelKey; db: BuildingLevel; label: string; sub: string }[] = [
  { key: "balcony", db: "BALCONY", label: "Balcony", sub: "Cardio Deck" },
  { key: "entry", db: "ENTRY", label: "Entry Level", sub: "Weight Floor" },
  { key: "lower2", db: "LOWER_2", label: "Lower Level II", sub: "Functional Training" },
];

// The floor plan drawing occupies roughly x 0.03–0.60 of the source image;
// crop the viewBox region via CSS to fill the panel better.
export function FacilityMap({
  equipment,
  selectedId,
  onSelect,
  arrange,
  onMove,
}: {
  equipment: MapEquipment[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  arrange: boolean;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const [focus, setFocus] = useState<LevelKey | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragOverride, setDragOverride] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{ id: string; el: HTMLDivElement } | null>(null);

  const byLevel = useMemo(() => {
    const m = new Map<BuildingLevel, MapEquipment[]>();
    for (const e of equipment) m.set(e.level, [...(m.get(e.level) ?? []), e]);
    return m;
  }, [equipment]);

  function counts(db: BuildingLevel) {
    const list = byLevel.get(db) ?? [];
    const down = list.filter((e) => STATUS_TONE[e.status] === "down" || STATUS_TONE[e.status] === "warn").length;
    return { total: list.length, down };
  }

  function pinPos(e: MapEquipment) {
    return dragOverride[e.id] ?? { x: e.mapX, y: e.mapY };
  }

  function startDrag(ev: React.PointerEvent<HTMLDivElement>, e: MapEquipment) {
    if (!arrange) return;
    ev.preventDefault();
    ev.stopPropagation();
    const container = (ev.currentTarget.closest("[data-level-plane]") as HTMLDivElement) ?? null;
    if (!container) return;
    dragRef.current = { id: e.id, el: container };
    const move = (me: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (me.clientX - r.left) / r.width));
      const fy = Math.min(1, Math.max(0, (me.clientY - r.top) / r.height));
      const { mapX, mapY } = unprojectPin(fx, fy);
      setDragOverride((prev) => ({ ...prev, [e.id]: { x: mapX, y: mapY } }));
    };
    const up = (me: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const r = container.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (me.clientX - r.left) / r.width));
      const fy = Math.min(1, Math.max(0, (me.clientY - r.top) / r.height));
      const { mapX, mapY } = unprojectPin(fx, fy);
      onMove(e.id, mapX, mapY);
      // parent state now owns the position; drop the local override so
      // later prop changes (e.g. undo) reflect on screen
      setDragOverride((prev) => {
        const next = { ...prev };
        delete next[e.id];
        return next;
      });
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const focusedMeta = LEVELS.find((l) => l.key === focus);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {/* Level controls */}
      <div className="absolute left-6 top-5 z-30 flex items-center gap-2">
        <button
          onClick={() => {
            setFocus(null);
            onSelect(null);
          }}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            focus === null
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-line bg-surface/70 text-ink-secondary backdrop-blur hover:text-ink"
          }`}
        >
          <LayersIcon className="h-4 w-4" />
          All Levels
        </button>
        {LEVELS.map((l) => {
          const c = counts(l.db);
          return (
            <button
              key={l.key}
              onClick={() => setFocus(l.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                focus === l.key
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line bg-surface/70 text-ink-secondary backdrop-blur hover:text-ink"
              }`}
            >
              {l.label}
              {c.down > 0 && (
                <span className="rounded-full bg-down/15 px-1.5 py-0.5 font-mono text-[11px] leading-none text-down">
                  {c.down}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-5 left-6 z-30 flex items-center gap-4 rounded-lg border border-line bg-surface/70 px-3.5 py-2 text-xs text-ink-secondary backdrop-blur">
        {(
          [
            ["up", "In service"],
            ["warn", "Repair in motion"],
            ["down", "Down / needs decision"],
            ["retired", "Retired"],
          ] as [StatusTone, string][]
        ).map(([tone, label]) => (
          <span key={tone} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: TONE_COLOR[tone], boxShadow: `0 0 6px ${TONE_GLOW[tone]}` }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* The stage */}
      <div className="absolute inset-0" style={{ perspective: focus ? "none" : "2400px" }}>
        {LEVELS.map((l, i) => {
          const isFocus = focus === l.key;
          const inStack = focus === null;
          const list = byLevel.get(l.db) ?? [];
          return (
            <motion.div
              key={l.key}
              className="absolute left-1/2 top-1/2"
              style={{
                width: "min(92%, 1250px)",
                aspectRatio: `${CROP.w} / ${CROP.h}`,
                transformStyle: "preserve-3d",
                pointerEvents: inStack || isFocus ? "auto" : "none",
                zIndex: isFocus ? 20 : 10 - i,
              }}
              initial={false}
              animate={
                inStack
                  ? {
                      x: "-50%",
                      y: `calc(-52% + ${(i - 1) * 23}%)`,
                      rotateX: 57,
                      rotateZ: -32,
                      scale: 0.78,
                      opacity: 1,
                      filter: "blur(0px)",
                    }
                  : isFocus
                    ? { x: "-50%", y: "-50%", rotateX: 0, rotateZ: 0, scale: 1.02, opacity: 1, filter: "blur(0px)" }
                    : {
                        x: "-50%",
                        y: `calc(-50% + ${(i - 1) * 60}%)`,
                        rotateX: 57,
                        rotateZ: -32,
                        scale: 0.7,
                        opacity: 0,
                        filter: "blur(6px)",
                      }
              }
              transition={{ type: "tween", duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
            >
              <motion.div
                data-level-plane={l.key}
                className={`relative h-full w-full ${inStack ? "cursor-pointer" : ""}`}
                onClick={inStack ? () => setFocus(l.key) : undefined}
                initial={false}
                animate={
                  isFocus
                    ? { scale: ZONE_FOCUS[l.key].s, x: `${ZONE_FOCUS[l.key].dx}%`, y: `${ZONE_FOCUS[l.key].dy}%` }
                    : { scale: 1, x: "0%", y: "0%" }
                }
                transition={{ type: "tween", duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* depth shadow under plate in stack view */}
                {inStack && (
                  <div
                    className="absolute inset-x-[8%] bottom-[-4%] h-[10%] rounded-[50%]"
                    style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)" }}
                  />
                )}
                <LevelSvg level={l.key} />

                {/* Pins */}
                {list.map((e) => {
                  const p = pinPos(e);
                  const tone = STATUS_TONE[e.status];
                  const Icon = CATEGORY_ICON[e.iconCategory];
                  const active = selectedId === e.id || hovered === e.id;
                  const proj = projectPin(p.x, p.y);
                  if (inStack) {
                    const attention = tone === "down" || tone === "warn";
                    return (
                      <span
                        key={e.id}
                        className="absolute rounded-full"
                        style={{
                          left: `${proj.left}%`,
                          top: `${proj.top}%`,
                          width: attention ? 10 : 5,
                          height: attention ? 10 : 5,
                          marginLeft: attention ? -5 : -2.5,
                          marginTop: attention ? -5 : -2.5,
                          background: TONE_COLOR[tone],
                          boxShadow: attention ? `0 0 14px 3px ${TONE_GLOW[tone]}` : `0 0 4px ${TONE_GLOW[tone]}`,
                          animation: attention ? "pulse-pin 2s ease-in-out infinite" : undefined,
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      key={e.id}
                      className="absolute"
                      style={{
                        left: `${proj.left}%`,
                        top: `${proj.top}%`,
                        zIndex: active ? 40 : 30,
                        transform: `translate(-50%, -50%) scale(${isFocus ? 1 / ZONE_FOCUS[l.key].s : 1})`,
                        transition: "transform 0.65s cubic-bezier(0.32, 0.72, 0, 1)",
                      }}
                      onPointerDown={(ev) => startDrag(ev, e)}
                      onMouseEnter={() => setHovered(e.id)}
                      onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                    >
                      <motion.button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (!arrange) onSelect(e.id);
                        }}
                        animate={{ scale: active ? 1.25 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border backdrop-blur-sm ${
                          arrange ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                        }`}
                        style={{
                          background: "rgba(24,19,16,0.88)",
                          borderColor: TONE_COLOR[tone],
                          color: TONE_COLOR[tone],
                          boxShadow: `0 0 ${active ? 18 : 10}px ${TONE_GLOW[tone]}${
                            e.flagged ? ", 0 0 0 2px rgba(248,113,113,0.35)" : ""
                          }`,
                        }}
                      >
                        <Icon className="h-[15px] w-[15px]" />
                      </motion.button>
                      <AnimatePresence>
                        {hovered === e.id && !arrange && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-bg-raised/95 px-3 py-2 shadow-2xl backdrop-blur"
                          >
                            <p className="text-[13px] font-medium leading-tight text-ink">{e.name}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-secondary">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: TONE_COLOR[tone] }}
                              />
                              {STATUS_SHORT[e.status]}
                              <span className="text-[color:var(--text-faint)]">· #{e.itemId}</span>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Screen-space level labels for the stack view */}
      {focus === null &&
        LEVELS.map((l, i) => {
          const c = counts(l.db);
          return (
            <button
              key={l.key}
              onClick={() => setFocus(l.key)}
              className="group absolute left-6 z-20 animate-[label-in_0.5s_ease_both] text-left"
              style={{ top: `calc(50% + ${(i - 1) * 23}% - 26px)`, animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <p className="text-[15px] font-semibold tracking-wide text-ink transition group-hover:text-accent">
                {l.label}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-secondary">
                {l.sub} · {c.total} units
                {c.down > 0 && <span className="text-down"> · {c.down} attention</span>}
              </p>
              <span className="mt-1.5 block h-px w-10 bg-line-strong transition-all group-hover:w-16 group-hover:bg-accent/60" />
            </button>
          );
        })}

      {/* Focused level footer label */}
      <AnimatePresence>
        {focusedMeta && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none absolute bottom-5 right-6 z-30 text-right"
          >
            <p className="text-lg font-semibold tracking-tight text-ink">{focusedMeta.label}</p>
            <p className="text-sm text-ink-secondary">{focusedMeta.sub}</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
