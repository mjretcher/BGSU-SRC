"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BuildingLevel, IconCategory } from "@/generated/prisma/enums";
import { LEVEL_LABEL, ICON_LABEL } from "@/lib/status";

const inputCls =
  "w-full rounded-lg border border-line-strong bg-bg-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent";

const ZONES: Record<BuildingLevel, string[]> = {
  ENTRY: ["Weight Floor"],
  BALCONY: ["Cardio deck"],
  LOWER_2: ["Functional Training Room", "Weights/Strength"],
};

export default function NewEquipmentPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    itemId: "",
    name: "",
    brand: "",
    model: "",
    serial: "",
    level: "ENTRY" as BuildingLevel,
    zone: "Weight Floor",
    iconCategory: "SPECIALTY" as IconCategory,
    vendor: "",
    purchaseDate: "",
    cost: "",
    warrantyMonths: "",
    warrantyExpiresAt: "",
    manualUrl: "",
    notes: "",
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "level") next.zone = ZONES[v as BuildingLevel][0];
      return next;
    });
  }

  const manualSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${f.brand} ${f.model || f.name} owner's manual pdf`,
  )}`;

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
    setBusy(false);
    if (res.ok && data?.id) {
      router.push(`/equipment/${data.id}`);
    } else {
      setError(data?.error ?? "Failed to create equipment");
    }
  }

  const field = (label: string, key: keyof typeof f, type = "text", placeholder = "") => (
    <label className="block text-[12px] text-ink-secondary">
      {label}
      <input
        className={inputCls + " mt-1"}
        type={type}
        placeholder={placeholder}
        value={f[key] as string}
        onChange={(e) => set(key, e.target.value as (typeof f)[typeof key])}
      />
    </label>
  );

  return (
    <main className="mx-auto max-w-2xl p-7">
      <Link href="/fleet" className="text-[13px] text-ink-secondary transition hover:text-accent">← Fleet</Link>
      <header className="mt-4 mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Add equipment</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          New unit goes on the map at its level&apos;s default spot — drag it into place afterward with Arrange pins.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-5">
        {field("Item ID (unique) *", "itemId", "text", "e.g. 223")}
        {field("Display name *", "name", "text", "e.g. Matrix Treadmill")}
        {field("Brand *", "brand", "text", "e.g. Matrix")}
        {field("Model", "model", "text", "exact code from the nameplate")}
        {field("Serial", "serial")}
        <label className="block text-[12px] text-ink-secondary">
          Icon category
          <select
            className={inputCls + " mt-1"}
            value={f.iconCategory}
            onChange={(e) => set("iconCategory", e.target.value as IconCategory)}
          >
            {(Object.keys(ICON_LABEL) as IconCategory[]).map((c) => (
              <option key={c} value={c}>{ICON_LABEL[c]}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Level *
          <select
            className={inputCls + " mt-1"}
            value={f.level}
            onChange={(e) => set("level", e.target.value as BuildingLevel)}
          >
            {(Object.keys(LEVEL_LABEL) as BuildingLevel[]).map((l) => (
              <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Zone *
          <select className={inputCls + " mt-1"} value={f.zone} onChange={(e) => set("zone", e.target.value)}>
            {ZONES[f.level].map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </label>
        {field("Vendor", "vendor")}
        {field("Purchase date", "purchaseDate", "date")}
        {field("Purchase cost (USD)", "cost", "number")}
        {field("Warranty length (months)", "warrantyMonths", "number")}
        {field("Warranty expires", "warrantyExpiresAt", "date")}
        {field("Manual URL", "manualUrl", "url", "manufacturer's manual link")}
        <label className="col-span-2 block text-[12px] text-ink-secondary">
          Notes
          <textarea className={inputCls + " mt-1"} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>

        {(f.brand || f.model) && (
          <p className="col-span-2 rounded-lg border border-line bg-bg-raised px-3.5 py-2.5 text-[12px] text-ink-secondary">
            Manual finder: search the web for{" "}
            <a href={manualSearchUrl} target="_blank" rel="noreferrer" className="text-accent">
              “{f.brand} {f.model || f.name} owner&apos;s manual”
            </a>{" "}
            and paste the manufacturer&apos;s link above — exact model matches only, per the manual policy.
          </p>
        )}

        {error && (
          <p className="col-span-2 rounded-lg border border-down/30 bg-down/10 px-3.5 py-2.5 text-sm text-down">{error}</p>
        )}

        <div className="col-span-2 flex gap-2">
          <button
            onClick={save}
            disabled={busy || !f.itemId.trim() || !f.name.trim() || !f.brand.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#052e2b] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create equipment"}
          </button>
          <Link href="/fleet" className="rounded-lg border border-line-strong px-4 py-2 text-sm text-ink-secondary transition hover:text-ink">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
