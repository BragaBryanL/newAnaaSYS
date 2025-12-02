const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "backend",
  password: "admin123",
  port: 5432,
});

async function checkFaculty() {
  try {
    const result = await pool.query("SELECT id, first_name, last_name, email, rfid FROM faculty");
    
    console.log("\n=== Faculty in Database ===\n");
    
    if (result.rows.length === 0) {
      console.log("No faculty found in database!");
    } else {
      result.rows.forEach(f => {
        console.log(`ID: ${f.id}`);
        console.log(`Name: ${f.first_name} ${f.last_name}`);
        console.log(`Email: ${f.email}`);
        console.log(`RFID: "${f.rfid}"`);
        console.log(`RFID Length: ${f.rfid ? f.rfid.length : 0}`);
        console.log("---");
      });
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkFaculty();
