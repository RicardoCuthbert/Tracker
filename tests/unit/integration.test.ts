import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialError, monthRange } from '../../src/lib/supabase/errors.ts';

test('database deployment errors differ from authorization and never expose raw details', () => {
  const missing = financialError({ code: 'PGRST202', message: 'private SQL and financial details', details: 'sensitive' });
  assert.equal(missing.kind, 'database_unavailable');
  assert.equal(financialError({ code: '42501' }).kind, 'denied');
  assert.equal(financialError({ code: '40001' }).kind, 'conflict');
  assert.equal(financialError({ code: 'unknown', message: 'secret' }).kind, 'unavailable');
  assert.doesNotMatch(JSON.stringify(missing), /private SQL|sensitive/);
});

test('read periods use calendar months, preserve Jakarta boundary and reject malformed input', () => {
  assert.deepEqual(monthRange('2026-12'), { month: '2026-12', start: '2026-12-01', until: '2027-01-01' });
  assert.deepEqual(monthRange(undefined, new Date('2026-10-31T17:30:00Z')), { month: '2026-11', start: '2026-11-01', until: '2026-12-01' });
  for (const value of ['2026-00', '2026-13', '0000-01', '2026-1', '2026-11/private', '9999-12']) assert.equal(monthRange(value), null);
});
