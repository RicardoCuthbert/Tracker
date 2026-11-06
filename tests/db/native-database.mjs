import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

export async function nativeDatabase(connectionString) {
  const url = new URL(connectionString);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/postgres' || url.search) {
    throw new Error('TEST_DATABASE_URL must target a dedicated loopback PostgreSQL cluster, database postgres, without URL parameters');
  }
  const control = new Client({ connectionString });
  await control.connect();
  const name = `finance_planner_test_${randomUUID().replaceAll('-', '')}`;
  await control.query(`create database "${name}"`);
  const testUrl = new URL(url); testUrl.pathname = `/${name}`;
  const clients = [];
  async function connect() {
    const label = `finance_test_${randomUUID()}`;
    const client = new Client({ connectionString: testUrl.href, application_name: label });
    await client.connect(); clients.push(client);
    return { label, query: (sql, args) => client.query(sql, args), exec: sql => client.query(sql), close: () => client.end() };
  }
  const main = await connect();
  return {
    ...main, connect,
    async close() {
      await Promise.all(clients.map(c => c.end()));
      // Only the database created above, never the supplied postgres database.
      await control.query(`drop database "${name}"`);
      await control.end();
    },
  };
}
