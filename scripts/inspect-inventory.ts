import ExcelJS from "exceljs";

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("data/equipment-inventory.xlsx");
  for (const ws of wb.worksheets) {
    console.log(`=== Sheet: "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount}`);
    const header = ws.getRow(1);
    const cols: string[] = [];
    header.eachCell({ includeEmpty: true }, (c, i) => {
      cols.push(`${i}:${String(c.value ?? "").trim()}`);
    });
    console.log("HEADERS:", cols.join(" | "));
    // sample rows 2-6 and a couple from the end
    const sample = [2, 3, 4, 5, 6, ws.rowCount - 1, ws.rowCount];
    for (const r of sample) {
      if (r < 2) continue;
      const row = ws.getRow(r);
      const vals: string[] = [];
      row.eachCell({ includeEmpty: true }, (c) => {
        let v = c.value as unknown;
        if (v && typeof v === "object" && "result" in (v as object)) v = (v as { result: unknown }).result;
        if (v instanceof Date) v = v.toISOString().slice(0, 10);
        vals.push(String(v ?? ""));
      });
      console.log(`row ${r}:`, JSON.stringify(vals));
    }
  }
}
main();
