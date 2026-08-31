import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { sessionFrom } from "@/lib/api";
import { fleetMetrics } from "@/lib/fleet";
import { fmtDuration } from "@/lib/metrics";
import { STATUS_LABEL, LEVEL_LABEL } from "@/lib/status";
import type { EquipmentStatus, BuildingLevel } from "@/generated/prisma/enums";
import type { PeriodKey } from "@/lib/metrics";
import { fleetPdf } from "./pdf";

export async function GET(req: NextRequest) {
  if (!(await sessionFrom(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const fmt = sp.get("fmt") ?? "csv";
  const period = (["week", "month", "ytd", "year"].includes(sp.get("period") ?? "") ? sp.get("period") : "year") as PeriodKey;
  const { rows, label } = await fleetMetrics(period);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `src-equipment-report-${period}-${stamp}`;

  const flat = rows.map((r) => ({
    itemId: r.itemId,
    name: r.name,
    brand: r.brand,
    model: r.model ?? "",
    level: LEVEL_LABEL[r.level as BuildingLevel],
    zone: r.zone,
    status: STATUS_LABEL[r.status as EquipmentStatus],
    downtimePct: Number(r.metrics.downtimePct.toFixed(2)),
    daysDown: Number(r.metrics.daysDown.toFixed(2)),
    events: r.metrics.eventCount,
    mttr: fmtDuration(r.metrics.mttrMs),
    mtbf: fmtDuration(r.metrics.mtbfMs),
    repairCost: Number(r.metrics.repairCost.toFixed(2)),
    flagged: r.flagged ? "YES" : "",
    warrantyExpires: r.warrantyExpiresAt?.toISOString().slice(0, 10) ?? "",
  }));

  const HEADERS = [
    "Item ID", "Name", "Brand", "Model", "Level", "Zone", "Status",
    "% Downtime", "Days Down", "Events", "MTTR", "MTBF", "Repair Cost (USD)", "Flagged ≥5%", "Warranty Expires",
  ];

  if (fmt === "csv") {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [HEADERS.join(","), ...flat.map((r) => Object.values(r).map(esc).join(","))];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
      },
    });
  }

  if (fmt === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Equipment Report");
    ws.addRow([`BGSU SRC — Equipment Report · ${label}`]);
    ws.getRow(1).font = { bold: true, size: 14 };
    ws.addRow([]);
    const headerRow = ws.addRow(HEADERS);
    headerRow.font = { bold: true };
    headerRow.border = { bottom: { style: "medium" } };
    for (const r of flat) ws.addRow(Object.values(r));
    ws.columns.forEach((col, i) => {
      col.width = i === 1 ? 32 : 14;
    });
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + flat.length, column: HEADERS.length } };
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  }

  if (fmt === "pdf") {
    const sorted = [...rows].sort((a, b) => b.metrics.downtimePct - a.metrics.downtimePct);
    const buf = await fleetPdf(sorted, label, new Date().toLocaleString());
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "fmt must be csv, xlsx, or pdf" }, { status: 400 });
}
