"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { STATUS_SHORT, STATUS_TONE, TONE_COLOR, LEVEL_LABEL, ICON_LABEL } from "@/lib/status";
import { CATEGORY_ICON } from "./icons";
import type { IconCategory } from "@/generated/prisma/enums";
import { fmtDuration, fmtMoney } from "@/lib/metrics";
import type { EquipmentStatus, BuildingLevel } from "@/generated/prisma/enums";

export interface FleetRowSerialized {
  id: string; itemId: string; name: string; brand: string; model: string | null;
  iconCategory: string;
  level: string; zone: string; status: string; flagged: boolean; flagPct: number;
  downtimePct: number; daysDown: number; eventCount: number;
  mttrMs: number | null; mtbfMs: number | null; repairCost: number;
}

type SortKey = "type" | "downtimePct" | "repairCost" | "mttrMs" | "mtbfMs" | "eventCount" | "name";

const PERIODS = [
  ["week", "Week"],
  ["month", "Month"],
  ["ytd", "YTD"],
  ["year", "12 mo"],
] as const;

export function FleetTable({ rows, period }: { rows: FleetRowSerialized[]; period: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [onlyDown, setOnlyDown] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [sort, setSort] = useState<SortKey>("type");
  const [dir, setDir] = useState<1 | -1>(-1);

  const filtered = useMemo(() => {
    let out = rows;
    if (q) {
      const needle = q.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.brand.toLowerCase().includes(needle) ||
          (r.model ?? "").toLowerCase().includes(needle) ||
          r.itemId.toLowerCase().includes(needle) ||
          ICON_LABEL[r.iconCategory as IconCategory].toLowerCase().includes(needle),
      );
    }
    if (level !== "all") out = out.filter((r) => r.level === level);
    if (onlyDown) out = out.filter((r) => STATUS_TONE[r.status as EquipmentStatus] !== "up" && r.status !== "RETIRED");
    if (onlyFlagged) out = out.filter((r) => r.flagged);
    return [...out].sort((a, b) => {
      if (sort === "type") {
        return (
          ICON_LABEL[a.iconCategory as IconCategory].localeCompare(ICON_LABEL[b.iconCategory as IconCategory]) ||
          a.name.localeCompare(b.name) ||
          a.itemId.localeCompare(b.itemId, undefined, { numeric: true })
        );
      }
      if (sort === "name") return dir * a.name.localeCompare(b.name);
      const av = a[sort] ?? -Infinity;
      const bv = b[sort] ?? -Infinity;
      return dir * (Number(av) - Number(bv));
    });
  }, [rows, q, level, onlyDown, onlyFlagged, sort, dir]);

  function header(key: SortKey, label: string, alignRight = true) {
    const active = sort === key;
    return (
      <th
        onClick={() => {
          if (active) setDir((d) => (d === 1 ? -1 : 1));
          else {
            setSort(key);
            setDir(key === "name" ? 1 : -1);
          }
        }}
        className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider transition hover:text-ink ${
          active ? "text-accent" : "text-[color:var(--text-faint)]"
        } ${alignRight ? "text-right" : "text-left"}`}
      >
        {label} {active ? (dir === -1 ? "↓" : "↑") : ""}
      </th>
    );
  }

  function setPeriod(p: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("period", p);
    router.push(`?${sp.toString()}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything — treadmill, Hammer Strength, TI1000, #110…"
          className="w-80 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm text-ink outline-none transition focus:border-accent"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none"
        >
          <option value="all">All levels</option>
          {(Object.keys(LEVEL_LABEL) as BuildingLevel[]).map((l) => (
            <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
          ))}
        </select>
        <button
          onClick={() => setOnlyDown((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            onlyDown ? "border-down/50 bg-down/10 text-down" : "border-line-strong text-ink-secondary hover:text-ink"
          }`}
        >
          Down now
        </button>
        <button
          onClick={() => setOnlyFlagged((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            onlyFlagged ? "border-down/50 bg-down/10 text-down" : "border-line-strong text-ink-secondary hover:text-ink"
          }`}
        >
          ⚑ Flagged ≥5%
        </button>
        <span className="ml-auto flex items-center gap-1 rounded-lg border border-line p-1">
          {PERIODS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-md px-2.5 py-1.5 text-[13px] transition ${
                period === key ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </span>
        <span className="font-mono text-[12px] text-[color:var(--text-faint)]">{filtered.length} shown</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[900px] border-collapse bg-surface/50 text-sm">
          <thead className="border-b border-line bg-bg-raised/60">
            <tr>
              <th
                onClick={() => setSort(sort === "type" ? "name" : "type")}
                className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider transition hover:text-ink ${
                  sort === "type" || sort === "name" ? "text-accent" : "text-[color:var(--text-faint)]"
                }`}
              >
                {sort === "name" ? "Equipment A–Z" : "Equipment · by type"}
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-faint)]">Status</th>
              {header("downtimePct", "% Down")}
              {header("eventCount", "Events")}
              {header("mttrMs", "MTTR")}
              {header("mtbfMs", "MTBF")}
              {header("repairCost", "Repair $")}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const tone = STATUS_TONE[r.status as EquipmentStatus];
              const cat = r.iconCategory as IconCategory;
              const CatIcon = CATEGORY_ICON[cat];
              const newGroup = sort === "type" && (i === 0 || filtered[i - 1].iconCategory !== r.iconCategory);
              const groupCount = sort === "type" ? filtered.filter((x) => x.iconCategory === r.iconCategory).length : 0;
              return (
                <Fragment key={r.id}>
                {newGroup && (
                  <tr className="border-b border-line bg-bg-raised/70">
                    <td colSpan={7} className="px-3 py-2">
                      <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-accent">
                        <CatIcon className="h-4 w-4" />
                        {ICON_LABEL[cat]}
                        <span className="font-mono text-[11px] font-normal text-[color:var(--text-faint)]">{groupCount}</span>
                      </span>
                    </td>
                  </tr>
                )}
                <tr className="border-b border-line/50 transition last:border-0 hover:bg-surface-hover">
                  <td className="px-3 py-2.5">
                    <Link href={`/equipment/${r.id}`} className="group block">
                      <span className="flex items-center gap-2">
                        {r.flagged && <span className="text-down" title={`${r.flagPct.toFixed(1)}% trailing 12 mo`}>⚑</span>}
                        <span className="font-medium text-ink transition group-hover:text-accent">{r.name}</span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-secondary">
                        {r.brand}
                        {r.model && <span className="font-mono"> · {r.model}</span>}
                        <span className="text-[color:var(--text-faint)]"> · #{r.itemId} · {LEVEL_LABEL[r.level as BuildingLevel]}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[13px]" style={{ color: TONE_COLOR[tone] }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
                      {STATUS_SHORT[r.status as EquipmentStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px]">
                    <span className={r.downtimePct >= 5 ? "text-down" : r.downtimePct > 0 ? "text-warn" : "text-ink-secondary"}>
                      {r.downtimePct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-ink-secondary">{r.eventCount}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-ink-secondary">{fmtDuration(r.mttrMs)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-ink-secondary">{fmtDuration(r.mtbfMs)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-ink">
                    {r.repairCost > 0 ? fmtMoney(r.repairCost) : <span className="text-[color:var(--text-faint)]">—</span>}
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
