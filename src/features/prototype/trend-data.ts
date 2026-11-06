import { chartNumber } from "../../lib/prototype.ts";
import type { Snapshot } from "./mock-data.ts";

export function getTrendData(snapshots: Record<string, Snapshot>, until: string) {
  const months = Object.keys(snapshots).filter((month) => month <= until).sort();
  if (!months.length) return [];
  const rows = [];
  const cursor = new Date(`${months[0]}-01T12:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= months[months.length - 1]) {
    const month = cursor.toISOString().slice(0, 7);
    const snapshot = snapshots[month];
    rows.push({ month, cash: snapshot ? chartNumber(snapshot.cash) : null, spending: snapshot ? chartNumber(snapshot.spending) : null, cashExact: snapshot?.cash ?? null, spendingExact: snapshot?.spending ?? null, asOf: snapshot?.asOf ?? null });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return rows;
}
