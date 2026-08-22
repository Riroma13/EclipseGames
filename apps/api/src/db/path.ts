const URI_SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/;

export function validateSqlitePath(filename: string): string {
  if (!filename || filename.includes('\0') || URI_SCHEME.test(filename)) {
    throw new Error('DATABASE_URL must be a local SQLite path.');
  }
  return filename;
}

export function databasePathFromEnv(value = process.env.DATABASE_URL ?? './data/eclipse.sqlite'): string {
  return validateSqlitePath(value);
}
