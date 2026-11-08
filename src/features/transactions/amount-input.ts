export function normalizeAmountInput(value: string): string {
  const raw = value.trim();
  const number = raw.replace(/^Rp\s*/, '');
  if (!/^-?(?:\d+|[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{0,2}(?:\.\d{3})+)$/.test(number)) return raw;
  return number.replaceAll(',', '').replaceAll('.', '').replace(/^(-?)0+(?=\d)/, '$1');
}

export function formatAmountInput(value: string): string {
  const raw = normalizeAmountInput(value);
  return /^-?\d+$/.test(raw) ? `Rp ${raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : value;
}

export function editAmountInput(value: string, inputType?: string): string {
  const editing = inputType === 'insertText' || inputType?.startsWith('delete');
  if (editing && /^Rp\s*-?$/.test(value)) return value.includes('-') ? '-' : '';
  return normalizeAmountInput(editing && /^Rp -?[\d,]*$/.test(value) ? value.replaceAll(',', '') : value);
}

export function amountCaret(display: string, digits: number): number {
  if (!digits) return Math.min(display.length, display.startsWith('Rp ') ? 3 : 0);
  for (let index = 0; index < display.length; index++) {
    if (/\d/.test(display[index]) && --digits === 0) return index + 1;
  }
  return display.length;
}
