export type Workspace = "personal" | "shared";
export type Entry = {
  id: string; date: string; description: string; category: string; group: string;
  account: string; amount: string; type: "Expense" | "Income" | "Refund" | "Transfer" | "Correction";
  author: string; payer?: string;
};
export type Budget = { name: string; planned: string | null; spent: string; remaining: string | null; progress: number };
export type Snapshot = {
  income: string; gross: string; refunds: string; spending: string; cash: string;
  budget: string; remaining: string; asOf: string;
  breakdown: { name: string; amount: string; share: string; color: string }[];
  budgets: Budget[]; entries: Entry[];
};
export const workspaceNames = { personal: "Cuthbert · Personal", shared: "Cuthbert & Valen · Shared" };
export const accounts = { personal: ["BCA Everyday", "Emergency savings", "Cash wallet"], shared: ["Household cash", "Household savings"] };
export const fixtureMonths = ["2026-11", "2026-10"];
const colors = ["#0284C7", "#38BDF8", "#BAE6FD", "#D91670"];

// Authored sample snapshots, never calculated from user input or used as real balances.
const personalNovember: Snapshot = {
  income: "18500000", gross: "4750000", refunds: "150000", spending: "4600000", cash: "26400000",
  budget: "7300000", remaining: "2700000", asOf: "2026-11-05",
  breakdown: [
    { name: "Home", amount: "2800000", share: "61%", color: colors[0] },
    { name: "Food & dining", amount: "820000", share: "18%", color: colors[1] },
    { name: "Bills", amount: "500000", share: "11%", color: colors[2] },
    { name: "Other", amount: "480000", share: "10%", color: colors[3] },
  ],
  budgets: [
    { name: "Home", planned: "2800000", spent: "2800000", remaining: "0", progress: 100 },
    { name: "Groceries", planned: "1500000", spent: "500000", remaining: "1000000", progress: 33 },
    { name: "Dining", planned: "1200000", spent: "320000", remaining: "880000", progress: 27 },
    { name: "Transport", planned: "600000", spent: "180000", remaining: "420000", progress: 30 },
    { name: "Bills", planned: "700000", spent: "500000", remaining: "200000", progress: 71 },
    { name: "Health", planned: "500000", spent: "300000", remaining: "200000", progress: 60 },
  ],
  entries: [
    { id: "p1", date: "2026-11-04", description: "Dinner at Warung Sore", category: "Dining", group: "Food & dining", account: "BCA Everyday", amount: "320000", type: "Expense", author: "Cuthbert" },
    { id: "p2", date: "2026-11-04", description: "Grocery return", category: "Groceries", group: "Food & dining", account: "BCA Everyday", amount: "150000", type: "Refund", author: "Cuthbert" },
    { id: "p3", date: "2026-11-03", description: "Electricity & internet", category: "Bills", group: "Bills", account: "BCA Everyday", amount: "500000", type: "Expense", author: "Cuthbert" },
    { id: "p4", date: "2026-11-03", description: "Weekly commute", category: "Transport", group: "Other", account: "Cash wallet", amount: "180000", type: "Expense", author: "Cuthbert" },
    { id: "p5", date: "2026-11-02", description: "Weekly groceries", category: "Groceries", group: "Food & dining", account: "BCA Everyday", amount: "650000", type: "Expense", author: "Cuthbert" },
    { id: "p6", date: "2026-11-02", description: "Pharmacy & check-up", category: "Health", group: "Other", account: "BCA Everyday", amount: "300000", type: "Expense", author: "Cuthbert" },
    { id: "p7", date: "2026-11-02", description: "Move to savings", category: "Transfer", group: "Transfer", account: "BCA Everyday → Emergency savings", amount: "1000000", type: "Transfer", author: "Cuthbert" },
    { id: "p8", date: "2026-11-01", description: "November rent", category: "Home", group: "Home", account: "BCA Everyday", amount: "2800000", type: "Expense", author: "Cuthbert" },
    { id: "p9", date: "2026-11-01", description: "Monthly salary", category: "Salary", group: "Income", account: "BCA Everyday", amount: "18500000", type: "Income", author: "Cuthbert" },
  ],
};
const sharedNovember: Snapshot = {
  income: "2000000", gross: "300000", refunds: "50000", spending: "250000", cash: "2760000", budget: "500000", remaining: "250000", asOf: "2026-11-05",
  breakdown: [{ name: "Groceries", amount: "250000", share: "100%", color: colors[0] }],
  budgets: [{ name: "Groceries", planned: "500000", spent: "250000", remaining: "250000", progress: 50 }, { name: "Dining", planned: null, spent: "0", remaining: null, progress: 0 }],
  entries: [
    { id: "s1", date: "2026-11-05", description: "Balance discrepancy", category: "Correction", group: "Correction", account: "Household cash", amount: "10000", type: "Correction", author: "Valen" },
    { id: "s2", date: "2026-11-04", description: "Grocery return", category: "Groceries", group: "Groceries", account: "Household cash", amount: "50000", type: "Refund", author: "Valen" },
    { id: "s3", date: "2026-11-03", description: "Move to household savings", category: "Transfer", group: "Transfer", account: "Household cash → Household savings", amount: "200000", type: "Transfer", author: "Cuthbert" },
    { id: "s4", date: "2026-11-02", description: "Household groceries", category: "Groceries", group: "Groceries", account: "Household cash", amount: "300000", type: "Expense", author: "Valen", payer: "Cuthbert" },
    { id: "s5", date: "2026-11-01", description: "Shared project income", category: "Project income", group: "Income", account: "Household cash", amount: "2000000", type: "Income", author: "Cuthbert" },
  ],
};
const personalOctober: Snapshot = {
  income: "18500000", gross: "6000000", refunds: "0", spending: "6000000", cash: "12500000", budget: "7300000", remaining: "1300000", asOf: "2026-10-31",
  breakdown: [{ name: "Home", amount: "2800000", share: "47%", color: colors[0] }, { name: "Food & dining", amount: "2000000", share: "33%", color: colors[1] }, { name: "Bills", amount: "500000", share: "8%", color: colors[2] }, { name: "Other", amount: "700000", share: "12%", color: colors[3] }],
  budgets: [
    { name: "Home", planned: "2800000", spent: "2800000", remaining: "0", progress: 100 },
    { name: "Groceries", planned: "1500000", spent: "1200000", remaining: "300000", progress: 80 },
    { name: "Dining", planned: "1200000", spent: "800000", remaining: "400000", progress: 67 },
    { name: "Transport", planned: "600000", spent: "300000", remaining: "300000", progress: 50 },
    { name: "Bills", planned: "700000", spent: "500000", remaining: "200000", progress: 71 },
    { name: "Health", planned: "500000", spent: "400000", remaining: "100000", progress: 80 },
  ],
  entries: [
    { id: "o1", date: "2026-10-31", description: "October rent", category: "Home", group: "Home", account: "BCA Everyday", amount: "2800000", type: "Expense", author: "Cuthbert" },
    { id: "o2", date: "2026-10-31", description: "October groceries", category: "Groceries", group: "Food & dining", account: "BCA Everyday", amount: "1200000", type: "Expense", author: "Cuthbert" },
    { id: "o3", date: "2026-10-31", description: "October dining", category: "Dining", group: "Food & dining", account: "BCA Everyday", amount: "800000", type: "Expense", author: "Cuthbert" },
    { id: "o4", date: "2026-10-31", description: "October bills", category: "Bills", group: "Bills", account: "BCA Everyday", amount: "500000", type: "Expense", author: "Cuthbert" },
    { id: "o5", date: "2026-10-31", description: "October commute", category: "Transport", group: "Other", account: "Cash wallet", amount: "300000", type: "Expense", author: "Cuthbert" },
    { id: "o6", date: "2026-10-31", description: "October health", category: "Health", group: "Other", account: "BCA Everyday", amount: "400000", type: "Expense", author: "Cuthbert" },
    { id: "o7", date: "2026-10-01", description: "Monthly salary", category: "Salary", group: "Income", account: "BCA Everyday", amount: "18500000", type: "Income", author: "Cuthbert" },
  ],
};
export const snapshots: Record<Workspace, Record<string, Snapshot>> = {
  personal: { "2026-11": personalNovember, "2026-10": personalOctober },
  shared: { "2026-11": sharedNovember },
};
export const goals = {
  personal: [
    { name: "A little more peace of mind", category: "Emergency fund", reserved: "6000000", target: "15000000", progress: 40, deadline: "No deadline", account: "Emergency savings", icon: "shield" },
    { name: "A new perspective", category: "Japan trip", reserved: "3500000", target: "10000000", progress: 35, deadline: "June 2027", account: "BCA Everyday", icon: "plane" },
  ],
  shared: [
    { name: "Room for what matters", category: "Home fund", reserved: "100000", target: "2000000", progress: 5, deadline: "No deadline", account: "Household savings", icon: "home" },
  ],
};
export const accountSnapshots = {
  personal: [{ name: "BCA Everyday", kind: "Bank account", balance: "19580000" }, { name: "Emergency savings", kind: "Savings", balance: "6000000" }, { name: "Cash wallet", kind: "Cash", balance: "820000" }],
  shared: [{ name: "Household cash", kind: "Cash", balance: "2560000" }, { name: "Household savings", kind: "Savings", balance: "200000" }],
};
