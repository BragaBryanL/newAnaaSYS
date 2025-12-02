// Quick database initialization script
// Run with: node init-database.js

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "backend",
  password: "admin123",
  port: 5432,
});

async function initDatabase() {
  try {
    console.log("Connecting to database...");
    
    const sqlFile = path.join(__dirname, "setup_database.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");
    
    console.log("Running SQL setup script...");
    await pool.query(sql);
    
    console.log("✓ Database initialized successfully!");
    console.log("✓ All tables, indexes, and triggers created!");
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log("\nCreated tables:");
    result.rows.forEach(row => console.log("  - " + row.table_name));
    
  } catch (err) {
    console.error("✗ Error initializing database:");
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

initDatabase();
