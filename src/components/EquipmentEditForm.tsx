"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-lg border border-line-strong bg-bg-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent";

export interface EditableEquipment {
  id: string;
  name: string;
  brand: string;
  model: string | null;
  serial: string | null;
  vendor: string | null;
  purchaseDate: string | null;
  cost: string | null;
  warrantyMonths: number | null;
  warrantyExpiresAt: string | null;
  manualUrl: string | null;
  manualPdfUrl: string | null;
  notes: string | null;
}

export function EquipmentEditForm({ equipment }: { equipment: EditableEquipment }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: equipment.name,
    brand: equipment.brand,
    model: equipment.model ?? "",
    serial: equipment.serial ?? "",
    vendor: equipment.vendor ?? "",
    purchaseDate: equipment.purchaseDate?.slice(0, 10) ?? "",
    cost: equipment.cost ?? "",
    warrantyMonths: equipment.warrantyMonths?.toString() ?? "",
    warrantyExpiresAt: equipment.warrantyExpiresAt?.slice(0, 10) ?? "",
    manualUrl: equipment.manualUrl ?? "",
    manualPdfUrl: equipment.manualPdfUrl ?? "",
    notes: equipment.notes ?? "",
  });
  const router = useRouter();

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/equipment/${equipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        brand: form.brand,
        model: form.model || null,
        serial: form.serial || null,
        vendor: form.vendor || null,
        purchaseDate: form.purchaseDate || null,
        cost: form.cost === "" ? null : Number(form.cost),
        warrantyMonths: form.warrantyMonths === "" ? null : Number(form.warrantyMonths),
        warrantyExpiresAt: form.warrantyExpiresAt || null,
        manualUrl: form.manualUrl || null,
        manualPdfUrl: form.manualPdfUrl || null,
        notes: form.notes || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <label className="block text-[12px] text-ink-secondary">
      {label}
      <input className={inputCls + " mt-1"} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <h2 className="text-[15px] font-semibold text-ink">Details & warranty</h2>
        <span className="text-ink-secondary">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {field("Display name", "name")}
          {field("Brand", "brand")}
          {field("Model", "model")}
          {field("Serial", "serial")}
          {field("Vendor", "vendor")}
          {field("Purchase date", "purchaseDate", "date")}
          {field("Purchase cost (USD)", "cost", "number")}
          {field("Warranty length (months)", "warrantyMonths", "number")}
          {field("Warranty expires", "warrantyExpiresAt", "date")}
          {field("Manufacturer manual URL", "manualUrl", "url")}
          {field("Stored PDF URL", "manualPdfUrl", "url")}
          <label className="col-span-2 block text-[12px] text-ink-secondary">
            Notes
            <textarea className={inputCls + " mt-1"} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
          <div className="col-span-2 flex items-center gap-3">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#052e2b] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-[13px] text-up">Saved — audit logged.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
