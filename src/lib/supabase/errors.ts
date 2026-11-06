import { jakartaDate } from '../prototype.ts';

export type FinancialFailure = {
  kind: 'denied' | 'database_unavailable' | 'conflict' | 'unavailable' | 'invalid_response';
  message: string;
};
export type FinancialResult<T> = { ok: true; data: T } | { ok: false; error: FinancialFailure };

export function financialError(error: { code?: string; message?: string; details?: unknown } | null): FinancialFailure {
  if (['PGRST202', 'PGRST205', '42883', '42P01'].includes(error?.code ?? '')) {
    return { kind: 'database_unavailable', message: 'Workspace service is not ready. Contact the project owner.' };
  }
  if (error?.code === '42501') return { kind: 'denied', message: 'Financial access is unavailable for this identity or workspace.' };
  if (error?.code === '40001') return { kind: 'conflict', message: 'This record changed. Reload before continuing.' };
  return { kind: 'unavailable', message: 'The service could not be reached. Try again.' };
}

export function monthRange(value?: string, now = new Date()) {
  const month = value ?? jakartaDate(now).slice(0, 7);
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month) || month < '0001-01' || month > '9998-12') return null;
  const [year, m] = month.split('-').map(Number);
  const until = m === 12 ? `${String(year + 1).padStart(4, '0')}-01-01` : `${year.toString().padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-01`;
  return { month, start: `${month}-01`, until };
}
