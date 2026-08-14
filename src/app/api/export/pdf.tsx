import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { FleetRow } from "@/lib/fleet";
import { fmtDuration, fmtMoney } from "@/lib/metrics";
import { STATUS_SHORT } from "@/lib/status";
import type { EquipmentStatus } from "@/generated/prisma/enums";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 8.5, fontFamily: "Helvetica", color: "#1a202c" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sub: { fontSize: 9, color: "#64748b", marginBottom: 14 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 3.5 },
  head: { flexDirection: "row", borderBottomWidth: 1.2, borderBottomColor: "#0f172a", paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  cName: { flex: 3.2 },
  cSmall: { flex: 1, textAlign: "right" },
  cStatus: { flex: 1.6 },
  flagged: { color: "#dc2626" },
});

export async function fleetPdf(rows: FleetRow[], periodLabel: string, generatedAt: string): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.h1}>BGSU SRC — Equipment Report</Text>
        <Text style={styles.sub}>
          {periodLabel} · generated {generatedAt} · {rows.length} units · ⚑ = ≥5% downtime trailing 12 months
        </Text>
        <View style={styles.head}>
          <Text style={styles.cName}>Equipment</Text>
          <Text style={styles.cStatus}>Status</Text>
          <Text style={styles.cSmall}>% Down</Text>
          <Text style={styles.cSmall}>Days</Text>
          <Text style={styles.cSmall}>Events</Text>
          <Text style={styles.cSmall}>MTTR</Text>
          <Text style={styles.cSmall}>MTBF</Text>
          <Text style={styles.cSmall}>Repair $</Text>
        </View>
        {rows.map((r) => (
          <View key={r.id} style={styles.row} wrap={false}>
            <Text style={styles.cName}>
              {r.flagged ? "⚑ " : ""}
              {r.name} — {r.brand}
              {r.model ? ` ${r.model}` : ""} (#{r.itemId})
            </Text>
            <Text style={styles.cStatus}>{STATUS_SHORT[r.status as EquipmentStatus]}</Text>
            <Text style={[styles.cSmall, ...(r.metrics.downtimePct >= 5 ? [styles.flagged] : [])]}>
              {r.metrics.downtimePct.toFixed(1)}%
            </Text>
            <Text style={styles.cSmall}>{r.metrics.daysDown.toFixed(1)}</Text>
            <Text style={styles.cSmall}>{r.metrics.eventCount}</Text>
            <Text style={styles.cSmall}>{fmtDuration(r.metrics.mttrMs)}</Text>
            <Text style={styles.cSmall}>{fmtDuration(r.metrics.mtbfMs)}</Text>
            <Text style={styles.cSmall}>{r.metrics.repairCost ? fmtMoney(r.metrics.repairCost) : "—"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
