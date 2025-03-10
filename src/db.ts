import { Pool } from 'pg';

export async function createTableIfNotExists(pool: Pool, schema: string) {
  const tableName = 'processed_likes';
  const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${tableName}'`);
  if (res.rowCount === 0) {
      await pool.query(`CREATE TABLE ${schema}.${tableName} (
          id SERIAL PRIMARY KEY,
          post_uri TEXT UNIQUE NOT NULL,
          processed_at TIMESTAMP DEFAULT NOW()
      )`);
      console.log(`created table ${tableName}`);
  } else {
      console.log(`${tableName} table exists.`);
  }
}

export async function isPostProcessed(pool : Pool, blueskyUri: string): Promise<boolean> {
  const res = await pool.query(
    'SELECT 1 FROM processed_likes WHERE post_uri = $1 LIMIT 1',
    [blueskyUri]
  );
  return res.rowCount != null && res.rowCount > 0;
}

export async function markPostAsProcessed(pool : Pool, blueskyUri: string) {
  await pool.query(
    'INSERT INTO processed_likes (post_uri) VALUES ($1) ON CONFLICT DO NOTHING',
    [blueskyUri]
  );
}
