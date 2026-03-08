import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = fs.readFileSync('./drizzle/0000_tidy_galactus.sql', 'utf8');

// Extract vendas CREATE TABLE statement
const match = sql.match(/CREATE TABLE `vendas`[\s\S]*?\);/);
if (!match) {
  console.error('Could not find vendas CREATE TABLE in migration file');
  process.exit(1);
}

const createVendasSQL = match[0];
console.log('Creating vendas table...');
console.log('SQL preview:', createVendasSQL.substring(0, 300));

try {
  await conn.execute(createVendasSQL);
  console.log('✅ vendas table created successfully!');
} catch (e) {
  console.error('Error creating vendas table:', e.message);
}

// Verify
const [cols] = await conn.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vendas' ORDER BY ORDINAL_POSITION");
console.log('\nvendas columns:', cols.map(r => r.COLUMN_NAME).join(', '));

await conn.end();
