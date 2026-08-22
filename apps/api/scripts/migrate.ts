import { openDatabase } from '../src/db/client.js';
import { databasePathFromEnv } from '../src/db/path.js';

const database = openDatabase(databasePathFromEnv());
database.close();
console.log('Database migrations applied.');
