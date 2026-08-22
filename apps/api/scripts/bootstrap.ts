import { openDatabase } from '../src/db/client.js';
import { bootstrapTeacher } from '../src/auth/service.js';
import { ensureProjectionFixture } from '../src/projection/repository.js';
import { databasePathFromEnv } from '../src/db/path.js';

const database = openDatabase(databasePathFromEnv());
const teacher = await bootstrapTeacher(
  database.database,
  process.env.BOOTSTRAP_TEACHER_EMAIL ?? 'teacher@example.test',
  process.env.BOOTSTRAP_TEACHER_PASSWORD ?? 'change-me-in-development',
);
ensureProjectionFixture(database.database, teacher.id);
database.close();
console.log(`Teacher bootstrap complete for ${teacher.email}.`);
