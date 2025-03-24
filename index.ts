import dotenv from 'dotenv'; 
import fs from 'fs';
import os from 'os';
import YTDlpWrap from 'yt-dlp-wrap';
import { Pool } from 'pg';
import { AtpAgent } from '@atproto/api';
import { bskyAuthenticate, bskyRun } from './src/bsky';

dotenv.config();

const agent = new AtpAgent({ 
  service: 'https://bsky.social' 
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const username = process.env.BSKY_USERNAME!;
const password = process.env.BSKY_PASSWORD!;
const scanAll = process.env.SCAN_ALL === '1';
const delay = parseInt(process.env.DELAY || '3000');
const ytDlpPath = process.env.YTDLPATH || os.platform.name == 'win32' ? 'yt-dlp.exe' : './yt-dlp';

async function main() {
  if (!fs.existsSync(ytDlpPath)) {
    await YTDlpWrap.downloadFromGithub(ytDlpPath);
  }

  const ytDlpWrap = new YTDlpWrap(ytDlpPath);

  try {
    await bskyAuthenticate(agent, username, password);
    await bskyRun(agent, pool, ytDlpWrap, undefined, { scanAll, delay });
  }
  catch (e) {
    console.error(e);
  }
  await pool.end();
  console.log('Done');
}

main().catch(console.error);