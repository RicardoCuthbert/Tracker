import test from "node:test";
import assert from "node:assert/strict";
import { formatIDR, parseAmount, jakartaDate, chartNumber, validEntryDate, canRenderPie } from "../../src/lib/prototype.ts";

test("pie displays nonnegative proportions only, with a positive total", () => {
  assert.equal(canRenderPie([2800000, 820000, 0]), true);
  for (const values of [[], [0, 0], [-50000, 300000], [null, 300000]]) {
    assert.equal(canRenderPie(values), false);
  }
});

test("formats exact whole IDR, including aggregates beyond safe Number range", () => {
  assert.equal(formatIDR("300000"), "Rp300.000");
  assert.equal(formatIDR("-50000"), "−Rp50.000");
  assert.equal(formatIDR("9007199254740993"), "Rp9.007.199.254.740.993");
});

test("accepts Indonesian whole rupiah without rounding", () => {
  assert.equal(parseAmount("10.000"), "10000");
  assert.equal(parseAmount(" 10000 "), "10000");
  assert.equal(parseAmount("1000000000000"), "1000000000000");
  for (const value of ["", "0", "-100", "1e5", "10,50", "10.00", "Rp100", "1000000000001", "NaN"]) {
    assert.equal(parseAmount(value), null, value);
  }
});

test("Jakarta day crosses month independently of browser timezone", () => {
  assert.equal(jakartaDate(new Date("2026-10-31T17:30:00Z")), "2026-11-01");
});

test("invalid calendar dates, future dates and pre-opening entries are rejected", () => {
  assert.equal(validEntryDate("2026-11-05", "2026-11-05"), true);
  for (const date of ["2026-02-30", "2026-11-06", "2025-12-31", "", "not-a-date"]) {
    assert.equal(validEntryDate(date, "2026-11-05"), false);
  }
});

test("unsafe chart conversion falls back instead of losing precision", () => {
  assert.equal(chartNumber("300000"), 300000);
  assert.equal(chartNumber("9007199254740993"), null);
});
