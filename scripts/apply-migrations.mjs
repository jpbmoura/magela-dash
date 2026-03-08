import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sql = fs.readFileSync('./drizzle/0000_tidy_galactus.sql', 'utf8');

// Split statements more carefully - handle multi-line CREATE TABLE
const statements = [];
let current = '';
for (const line of sql.split('\n')) {
  current += line + '\n';
  if (line.trim() === ');') {
    statements.push(current.trim());
    current = '';
  } else if (line.trim().endsWith(';') && !line.trim().startsWith('`') && !line.trim().startsWith('\t')) {
    statements.push(current.trim());
    current = '';
  }
}

let ok = 0, skip = 0, err = 0;

for (const stmt of statements) {
  const trimmed = stmt.trim();
  if (!trimmed || trimmed.startsWith('--')) { skip++; continue; }
  if (trimmed.includes('CREATE TABLE `users`')) { skip++; console.log('Skipped: users table'); continue; }
  if (trimmed.includes('__drizzle_migrations')) { skip++; continue; }
  
  try {
    await conn.execute(trimmed);
    const tableName = trimmed.match(/CREATE TABLE `([^`]+)`/)?.[1] || trimmed.substring(0, 40);
    console.log('OK:', tableName);
    ok++;
  } catch(e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Already exists:', e.message.substring(0, 60));
      skip++;
    } else {
      console.error('ERR:', e.code, e.message.substring(0, 100));
      err++;
    }
  }
}

await conn.end();
console.log('\nDone. OK:', ok, 'Skipped:', skip, 'Errors:', err);
