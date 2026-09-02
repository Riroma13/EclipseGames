import { openDatabase } from '../src/db/client.js';
import { databasePathFromEnv } from '../src/db/path.js';
import { bootstrapTeacher } from '../src/auth/service.js';
import { seedDemo } from '../src/demo/seed-service.js';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed refused in production.');
  const database = openDatabase(databasePathFromEnv());
  try {
    const teacher = await bootstrapTeacher(database.database, process.env.BOOTSTRAP_TEACHER_EMAIL ?? 'teacher@example.test', process.env.BOOTSTRAP_TEACHER_PASSWORD ?? 'change-me-in-development');
    const result = seedDemo(database.database, teacher.id);
    console.log(`Demo roster ready: ${result.roster.students.length} students, ${result.events.length} XP requests checked, ${result.coinGrants.length} Eclipse Points grants checked, Weekend Story and Conversation Starters content ready.`);
  } finally { database.close(); }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
