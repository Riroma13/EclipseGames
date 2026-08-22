import { access, copyFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { databasePathFromEnv } from '../src/db/path.js';

const databasePath = databasePathFromEnv();
await mkdir(dirname(databasePath), { recursive: true });
try {
  await access('.env');
  console.log('.env already exists; configuration unchanged.');
} catch {
  await copyFile('.env.example', '.env');
  console.log('Created .env from .env.example.');
}
