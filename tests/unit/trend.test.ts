import test from "node:test";
import assert from "node:assert/strict";
import { getTrendData } from "../../src/features/prototype/trend-data.ts";
import { snapshots } from "../../src/features/prototype/mock-data.ts";

test("trend uses exact snapshots, selected period and workspace only", () => {
  const personal = getTrendData(snapshots.personal, "2026-11");
  assert.deepEqual(personal.map((row) => [row.month, row.cash, row.spending]), [["2026-10",12500000,6000000],["2026-11",26400000,4600000]]);
  assert.equal(getTrendData(snapshots.personal,"2026-10").length,1);
  assert.equal(getTrendData(snapshots.shared,"2026-11").length,1);
  assert.equal(getTrendData(snapshots.personal,"2026-09").length,0);
});

test("missing months stay unknown and unsafe values stay exact", () => {
  const sample = snapshots.personal["2026-11"];
  const rows = getTrendData({"2026-09":sample,"2026-11":{...sample,cash:"9007199254740993"}},"2026-11");
  assert.equal(rows[1].month,"2026-10");
  assert.equal(rows[1].cash,null);
  assert.equal(rows[1].cashExact,null);
  assert.equal(rows[2].cash,null);
  assert.equal(rows[2].cashExact,"9007199254740993");
});
