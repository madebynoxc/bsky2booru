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
const defaultYtDlpPath = os.platform() === 'win32' ? '.\\yt-dlp.exe' : './yt-dlp';
let ytDlpPath = process.env.YTDLPATH || defaultYtDlpPath;

async function main() {
  if (!fs.existsSync(ytDlpPath)) {
    console.log('Downloading yt-dlp from Github...');
    await YTDlpWrap.downloadFromGithub();
    ytDlpPath = defaultYtDlpPath; // Using the default path
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