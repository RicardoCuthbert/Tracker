import nextEnv from '@next/env';
import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { authConfig } from '../src/lib/supabase/config.ts';

const loaded = nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function files(folder) {
  const result = [];
  try {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const name = `${folder}/${entry.name}`;
      if (entry.isDirectory()) result.push(...await files(name)); else result.push(name);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return result;
}
const privateValues = Object.entries(loaded.parsedEnv ?? {})
  .filter(([name,value]) => /SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE_URL|KEY/.test(name) && !name.includes('PUBLISHABLE') && value.length >= 12).map(([,value]) => value);
const source = (await files('src')).filter(f => /\.(ts|tsx)$/.test(f));
const bundle = (await files('.next/static')).filter(f => f.endsWith('.js'));
async function matches(paths, predicate) {
  const result = [];
  for (const path of paths) if (predicate(await readFile(path, 'utf8'))) result.push(path);
  return result;
}
const ignores = (await readFile('.gitignore','utf8')).split(/\r?\n/).map(s=>s.trim());
const publicSecretNames = Object.keys(loaded.parsedEnv ?? {}).filter(n => n.startsWith('NEXT_PUBLIC_') && /SECRET|SERVICE_ROLE|PASSWORD|PRIVATE/.test(n));
const hardcoded = await matches(source, text => /sb_(?:secret|publishable)_[A-Za-z0-9_-]{32,}|eyJ[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/.test(text));
const sourceLeaks = await matches(source, text => privateValues.some(v=>text.includes(v)));
const bundleLeaks = await matches(bundle, text => privateValues.some(v=>text.includes(v)));
let gitRepository = true; try { await access('.git'); } catch { gitRepository = false; }
const migrationHashes = [];
for (const file of (await files('supabase/migrations')).sort()) migrationHashes.push({ file, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
const result = {
  configurationValid: Boolean(authConfig()), envLocalIgnoredByRule: ignores.includes('.env*') && !ignores.includes('!.env.local'),
  gitIndexInspection: gitRepository ? 'NOT TESTED by this script' : 'BLOCKED: no Git repository',
  publicSecretVariableCount: publicSecretNames.length, hardcodedCredentialCandidateFiles: hardcoded,
  privateCredentialValueMatchSourceFiles: sourceLeaks, privateCredentialValueMatchClientBundleFiles: bundleLeaks,
  sourceFilesScanned: source.length, clientBundlesScanned: bundle.length, migrationHashes,
};
await mkdir('test-results',{recursive:true});
await writeFile('test-results/local-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if (!result.configurationValid || !result.envLocalIgnoredByRule || publicSecretNames.length || hardcoded.length || sourceLeaks.length || bundleLeaks.length) process.exitCode=1;
