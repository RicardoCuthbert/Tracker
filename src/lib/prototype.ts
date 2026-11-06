const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatIDR(value: string): string {
  const amount = BigInt(value);
  return `${amount < 0n ? "−" : ""}Rp${idr.format(amount < 0n ? -amount : amount)}`;
}

export function parseAmount(value: string): string | null {
  const input = value.trim();
  if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)$/.test(input) || input.length > 25) return null;
  const amount = BigInt(input.replaceAll(".", ""));
  return amount > 0n && amount <= 1_000_000_000_000n ? amount.toString() : null;
}

export function jakartaDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export function validEntryDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2026-01-01" || value > today) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function chartNumber(value: string): number | null {
  const integer = BigInt(value);
  return integer <= BigInt(Number.MAX_SAFE_INTEGER) && integer >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(integer) : null;
}

export function canRenderPie(values: (number | null)[]): boolean {
  return values.every((value) => value !== null && value >= 0) && values.some((value) => value !== null && value > 0);
}

export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${month}-01T12:00:00Z`));
}

export function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T12:00:00Z`));
}
