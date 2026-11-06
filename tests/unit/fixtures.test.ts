import test from "node:test";
import assert from "node:assert/strict";
import { snapshots, accounts, accountSnapshots, goals } from "../../src/features/prototype/mock-data.ts";

test("authored snapshot totals agree with their sample records, excluding transfers and corrections", () => {
  for (const months of Object.values(snapshots)) {
    for (const [month, snapshot] of Object.entries(months)) {
      const sum = (type: string) => snapshot.entries.filter((entry) => entry.type === type).reduce((total, entry) => total + BigInt(entry.amount), 0n);
      assert.equal(sum("Income"), BigInt(snapshot.income));
      assert.equal(sum("Expense"), BigInt(snapshot.gross));
      assert.equal(sum("Refund"), BigInt(snapshot.refunds));
      assert.equal(sum("Expense") - sum("Refund"), BigInt(snapshot.spending));
      assert.equal(snapshot.breakdown.reduce((total, item) => total + BigInt(item.amount), 0n), BigInt(snapshot.spending));
      assert.ok(snapshot.entries.every((entry) => entry.date.startsWith(month)));
    }
  }
});

test("shared fixtures contain no personal account references", () => {
  for (const snapshot of Object.values(snapshots.shared)) {
    for (const entry of snapshot.entries) {
      assert.ok(!accounts.personal.some((name) => entry.account.includes(name)));
    }
  }
  assert.ok(goals.shared.every((goal) => accounts.shared.includes(goal.account)));
});

test("current sample accounts match declared closing cash; goal progress is explicitly authored", () => {
  for (const workspace of ["personal", "shared"] as const) {
    assert.equal(accountSnapshots[workspace].reduce((total, account) => total + BigInt(account.balance), 0n), BigInt(snapshots[workspace]["2026-11"].cash));
  }
  assert.equal(snapshots.shared["2026-11"].cash, "2760000");
  assert.equal(goals.shared[0].reserved, "100000");
});
