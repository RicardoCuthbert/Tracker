import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, writeFile } from 'node:fs/promises';

// Generate from an isolated migration database, never a remote/real-data connection.
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;`);
  const folder = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(folder)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, folder), 'utf8'));
  const { rows } = await db.query(`select proname,proargnames,oidvectortypes(proargtypes) args,
    pronargdefaults defaults,format_type(prorettype,null) result from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by proname`);
  const types = { uuid: 'string', text: 'string', date: 'string', integer: 'number', bigint: 'string', boolean: 'boolean', jsonb: 'Json' };
  const type = sql => { if (!types[sql]) throw new Error('Unsupported SQL type in RPC generator'); return types[sql]; };
  const functions = rows.map(row => {
    const args = row.args ? row.args.split(', ') : [];
    const fields = args.map((arg, i) => `${row.proargnames[i]}${i >= args.length - row.defaults ? '?' : ''}: ${type(arg)}`).join('; ');
    return `      ${row.proname}: { Args: ${args.length ? `{ ${fields} }` : 'Record<string, never>'}; Returns: ${type(row.result)} };`;
  }).join('\n');
  const output = `// Generated from local SQL migrations by scripts/generate-rpc-types.mjs. Do not edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = {\n  public: {\n    Tables: Record<string, never>;\n    Views: Record<string, never>;\n    Functions: {\n${functions}\n    };\n    Enums: Record<string, never>;\n    CompositeTypes: Record<string, never>;\n  };\n};\n`;
  const target = new URL('../src/lib/supabase/database.types.ts', import.meta.url);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== output) throw new Error('RPC types differ from migrations; run npm run db:types');
    console.log(`PASS ${rows.length} RPC type contracts match local migrations`);
  } else { await writeFile(target, output); console.log(`Generated ${rows.length} local RPC type contracts`); }
} finally { await db.close(); }
