require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cron = require("node-cron");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "backend",
  password: process.env.DB_PASS || "admin123",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

// Test database connection on startup
pool.query("SELECT NOW()")
  .then(() => {
    console.log("✓ Database connected successfully");
    return pool.query("SELECT current_database(), COUNT(*) as faculty_count FROM faculty");
  })
  .then(result => {
    console.log(`✓ Connected to database: ${result.rows[0].current_database}`);
    console.log(`✓ Faculty count: ${result.rows[0].faculty_count}`);
  })
  .catch(err => console.error("✗ Database connection failed:", err.message));

// -------------------------------
// In-memory store for unregistered RFID scans
// Persisted to disk (rfid_unregistered.json) so they survive restarts
// -------------------------------
const UNREG_FILE = path.join(__dirname, "rfid_unregistered.json");
let unregisteredScans = [];

function loadUnregistered() {
  try {
    if (fs.existsSync(UNREG_FILE)) {
      const raw = fs.readFileSync(UNREG_FILE, "utf8");
      unregisteredScans = JSON.parse(raw) || [];
    } else {
      unregisteredScans = [];
    }
  } catch (err) {
    console.error("Failed to load unregistered scans:", err);
    unregisteredScans = [];
  }
}

function saveUnregistered() {
  try {
    fs.writeFileSync(UNREG_FILE, JSON.stringify(unregisteredScans, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save unregistered scans:", err);
  }
}

loadUnregistered();

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Backend server running. Use /faculty or /api endpoints." 
  });
});

// ===============================
// FACULTY MANAGEMENT ENDPOINTS
// ===============================

/**
 * GET /faculty
 * Retrieve all faculty members with their current status
 * Returns: Array of faculty objects with joined user_status
 */
app.get("/faculty", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id, f.first_name, f.middle_initial, f.last_name, f.titles, 
        f.email, f.rfid, f.department, f.created_at, f.updated_at, f.photo,
        us.status, us.last_updated
      FROM faculty f
      LEFT JOIN user_status us ON f.id = us.faculty_id
      ORDER BY f.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching faculty list" });
  }
});

/**
 * GET /faculty/check?email={email}&rfid={rfid}
 * Check if a faculty member exists by email or RFID
 * Query params: email (optional), rfid (optional)
 * Returns: { exists: boolean, faculty: object|null }
 */
app.get("/faculty/check", async (req, res) => {
  try {
    const { email, rfid } = req.query;
    if (!email && !rfid) {
      return res.status(400).json({ error: "Provide email or rfid query param" });
    }

    if (rfid) {
      const r = await pool.query(
        "SELECT id, first_name, last_name, rfid FROM faculty WHERE TRIM(UPPER(rfid)) = TRIM(UPPER($1)) LIMIT 1",
        [rfid]
      );
      return res.json({ exists: r.rowCount > 0, faculty: r.rows[0] || null });
    }

    if (email) {
      const r = await pool.query(
        "SELECT id, first_name, last_name, email FROM faculty WHERE TRIM(LOWER(email)) = TRIM(LOWER($1)) LIMIT 1",
        [email]
      );
      return res.json({ exists: r.rowCount > 0, faculty: r.rows[0] || null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error checking faculty" });
  }
});

/**
 * GET /faculty/rfid/:tag
 * Lookup faculty by RFID tag (used by RFID reader)
 * Path param: tag (RFID string)
 * Returns: { faculty: object } or 404 error
 */
app.get("/faculty/rfid/:tag", async (req, res) => {
  const { tag } = req.params;
  try {
    console.log(`[RFID LOOKUP] Searching for tag: "${tag}"`);
    const q = "SELECT * FROM faculty WHERE TRIM(UPPER(rfid)) = TRIM(UPPER($1)) LIMIT 1";
    const result = await pool.query(q, [tag]);
    console.log(`[RFID LOOKUP] Found ${result.rowCount} results`);
    if (result.rowCount === 0) {
      // Debug: show all RFIDs in database
      const allRfids = await pool.query("SELECT id, first_name, last_name, rfid FROM faculty");
      console.log(`[RFID DEBUG] All RFIDs in database:`);
      allRfids.rows.forEach(r => console.log(`  ID ${r.id}: "${r.rfid}" (length: ${r.rfid?.length})`));
      return res.status(404).json({ error: "RFID not registered" });
    }
    return res.json({ faculty: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /faculty/add
 * Register a new faculty member
 * Body: { firstName, middleInitials, lastName, titles, email, rfid, department, password, photo }
 * Returns: { success: true, message: string, faculty: object }
 */
app.post("/faculty/add", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      firstName, middleInitials, lastName, titles,
      email, rfid, department, password, photo
    } = req.body;

    const normEmail = email ? email.trim().toLowerCase() : "";
    const normRfid = rfid ? rfid.trim() : "";

    // Check for duplicate email or RFID
    const existing = await client.query(
      "SELECT id FROM faculty WHERE TRIM(LOWER(email)) = $1 OR TRIM(rfid) = $2",
      [normEmail, normRfid]
    );
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        success: false, 
        message: "Email or RFID already in use" 
      });
    }

    // Insert faculty record
    const facultyResult = await client.query(
      `INSERT INTO faculty (first_name, middle_initial, last_name, titles, email, rfid, department, photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [firstName, middleInitials, lastName, titles, normEmail, normRfid, department, photo]
    );
    const facultyId = facultyResult.rows[0].id;

    // Insert authentication record
    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      await client.query(
        "INSERT INTO faculty_auth (faculty_id, username, password) VALUES ($1,$2,$3)",
        [facultyId, normEmail, hashed]
      );
    } else {
      await client.query(
        "INSERT INTO faculty_auth (faculty_id, username) VALUES ($1,$2)",
        [facultyId, normEmail]
      );
    }

    // Initialize user status
    await client.query(
      "INSERT INTO user_status (faculty_id, status, last_updated) VALUES ($1, 'Active', NOW())",
      [facultyId]
    );

    // Create notification
    await client.query(
      "INSERT INTO notifications (faculty_id, type, message, created_at) VALUES ($1, 'faculty_created', $2, NOW())",
      [facultyId, "Faculty successfully created."]
    );

    await client.query("COMMIT");
    res.json({ 
      success: true, 
      message: "Faculty registered successfully", 
      faculty: facultyResult.rows[0] 
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ error: "Error registering faculty" });
  } finally {
    client.release();
  }
});

/**
 * PUT /faculty/:id
 * Update an existing faculty member
 * Path param: id (faculty ID)
 * Body: { firstName, middleInitials, lastName, titles, email, rfid, department, photo, password }
 * Returns: { success: true, faculty: object }
 */
app.put("/faculty/:id", async (req, res) => {
  const { id } = req.params;
  const {
    firstName, middleInitials, lastName, titles,
    email, rfid, department, photo, password
  } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const normEmail = email ? email.trim().toLowerCase() : null;
    const normRfid = rfid ? rfid.trim() : null;

    // Check for duplicate email/RFID (excluding current faculty)
    const dup = await client.query(
      `SELECT id FROM faculty
       WHERE (TRIM(LOWER(email)) = TRIM(LOWER($1)) OR TRIM(rfid) = $2) AND id <> $3 LIMIT 1`,
      [normEmail, normRfid, id]
    );
    if (dup.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
        success: false, 
        message: "Email or RFID already used by another faculty" 
      });
    }

    // Update faculty record
    const facultyResult = await client.query(
      `UPDATE faculty SET
         first_name = $1, middle_initial = $2, last_name = $3, titles = $4,
         email = $5, rfid = $6, department = $7, photo = $8
       WHERE id = $9 RETURNING *`,
      [firstName, middleInitials, lastName, titles, normEmail, normRfid, department, photo, id]
    );

    // Update authentication record
    const authRow = await client.query(
      "SELECT faculty_id FROM faculty_auth WHERE faculty_id = $1", 
      [id]
    );
    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      if (authRow.rowCount > 0) {
        await client.query(
          "UPDATE faculty_auth SET password = $1, username = $2 WHERE faculty_id = $3", 
          [hashed, normEmail, id]
        );
      } else {
        await client.query(
          "INSERT INTO faculty_auth (faculty_id, username, password) VALUES ($1,$2,$3)", 
          [id, normEmail, hashed]
        );
      }
    } else {
      if (authRow.rowCount > 0) {
        await client.query(
          "UPDATE faculty_auth SET username = $1 WHERE faculty_id = $2", 
          [normEmail, id]
        );
      } else {
        await client.query(
          "INSERT INTO faculty_auth (faculty_id, username) VALUES ($1,$2)", 
          [id, normEmail]
        );
      }
    }

    // Create notification
    await client.query(
      "INSERT INTO notifications (faculty_id, type, message, created_at) VALUES ($1, 'faculty_updated', $2, NOW())",
      [id, "Faculty profile updated."]
    );

    await client.query("COMMIT");
    res.json({ success: true, faculty: facultyResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ error: "Error updating faculty" });
  } finally {
    client.release();
  }
});

/**
 * GET /faculty/:id/rfid-scan-status
 * Check if faculty has scanned RFID within the last 12 hours (for testing)
 * Path param: id (faculty ID)
 * Returns: { canChangeStatus: boolean, lastScan: timestamp|null, hoursAgo: number|null }
 */
app.get("/faculty/:id/rfid-scan-status", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT created_at, 
              EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_ago
       FROM rfid_logs 
       WHERE faculty_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.json({ 
        canChangeStatus: false, 
        lastScan: null, 
        hoursAgo: null,
        message: "No RFID scan found. Please scan your RFID card first."
      });
    }
    
    const secondsAgo = parseFloat(result.rows[0].seconds_ago);
    const canChangeStatus = secondsAgo <= 30;
    
    res.json({ 
      canChangeStatus, 
      lastScan: result.rows[0].created_at, 
      hoursAgo: (secondsAgo / 3600).toFixed(1),
      message: canChangeStatus 
        ? "RFID scan verified" 
        : `Last scan was ${secondsAgo.toFixed(0)} seconds ago. Please scan your RFID card.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /faculty/:id/status
 * Update faculty status (Active, Busy, Offline)
 * Path param: id (faculty ID)
 * Body: { status: string, bypassRfidCheck: boolean (optional) }
 * Returns: { success: true }
 * 
 * Note: bypassRfidCheck should only be used by web admin interface
 * Mobile app users must have valid RFID scan within 12 hours
 */
app.patch("/faculty/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, bypassRfidCheck } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Only check RFID if not bypassed (mobile app must follow this rule)
    if (!bypassRfidCheck) {
      // Check if user has scanned RFID within last 30 seconds (for testing)
      const rfidCheck = await client.query(
        `SELECT created_at, 
                EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_ago
         FROM rfid_logs 
         WHERE faculty_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [id]
      );
      
      if (rfidCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ 
          error: "RFID scan required",
          message: "Please scan your RFID card before changing status."
        });
      }
      
      const secondsAgo = parseFloat(rfidCheck.rows[0].seconds_ago);
      if (secondsAgo > 30) {
        await client.query("ROLLBACK");
        return res.status(403).json({ 
          error: "RFID scan expired",
          message: `Last scan was ${secondsAgo.toFixed(0)} seconds ago. Please scan your RFID card.`
        });
      }
    }
    
    // Update or insert status
    const update = await client.query(
      "UPDATE user_status SET status = $1, last_updated = NOW() WHERE faculty_id = $2 RETURNING *",
      [status, id]
    );
    if (update.rowCount === 0) {
      await client.query(
        "INSERT INTO user_status (faculty_id, status, last_updated) VALUES ($1,$2,NOW())", 
        [id, status]
      );
    }
    
    // Create notification
    await client.query(
      "INSERT INTO notifications (faculty_id, type, message, created_at) VALUES ($1, 'status_change', $2, NOW())", 
      [id, `Status changed to ${status}`]
    );
    
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ error: "Error updating status" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /faculty/:id
 * Delete a faculty member and all related records
 * Path param: id (faculty ID)
 * Returns: { success: true }
 */
app.delete("/faculty/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Delete all related records (cascade)
    await client.query("DELETE FROM faculty_auth WHERE faculty_id = $1", [id]);
    await client.query("DELETE FROM user_status WHERE faculty_id = $1", [id]);
    await client.query("DELETE FROM notifications WHERE faculty_id = $1", [id]);
    await client.query("DELETE FROM faculty WHERE id = $1", [id]);
    
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(400).json({ error: err.message || "Error deleting faculty" });
  } finally {
    client.release();
  }
});

// ===============================
// RFID SCAN ENDPOINTS
// ===============================

/**
 * POST /rfid/scan
 * Process an RFID scan (registered or unregistered)
 * Body: { tag: string, faculty_id?: number, type?: string, message?: string }
 * Returns: 
 *   - Registered: { success: true, registered: true, faculty: object }
 *   - Unregistered: { success: true, registered: false, event: object }
 */
app.post("/rfid/scan", async (req, res) => {
  const { tag, faculty_id, type, message } = req.body;
  const normalizedTag = (tag || "").trim();

  if (!normalizedTag) {
    return res.status(400).json({ error: "tag is required" });
  }

  try {
    let faculty = null;
    
    // Lookup faculty by ID or RFID
    if (faculty_id) {
      const r = await pool.query(
        "SELECT id, first_name, last_name FROM faculty WHERE id = $1 LIMIT 1", 
        [faculty_id]
      );
      if (r.rowCount > 0) faculty = r.rows[0];
    } else {
      const r = await pool.query(
        "SELECT id, first_name, last_name FROM faculty WHERE TRIM(UPPER(rfid)) = TRIM(UPPER($1)) LIMIT 1", 
        [normalizedTag]
      );
      if (r.rowCount > 0) faculty = r.rows[0];
    }

    // REGISTERED TAG FLOW
    if (faculty) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        // Update user status to Busy (default when RFID scanned)
        const upd = await client.query(
          "UPDATE user_status SET status = $1, last_updated = NOW() WHERE faculty_id = $2 RETURNING *",
          ["Busy", faculty.id]
        );
        if (upd.rowCount === 0) {
          await client.query(
            "INSERT INTO user_status (faculty_id, status, last_updated) VALUES ($1,$2,NOW())", 
            [faculty.id, "Busy"]
          );
        }

        // Insert RFID log
        try {
          await client.query(
            "INSERT INTO rfid_logs (faculty_id, tag_id, created_at) VALUES ($1,$2,NOW())",
            [faculty.id, normalizedTag]
          );
        } catch (innerErr) {
          console.warn("rfid_logs insert skipped or failed:", innerErr.message || innerErr);
        }

        // Insert notification
        try {
          await client.query(
            "INSERT INTO notifications (faculty_id, type, message, created_at) VALUES ($1, $2, $3, NOW())",
            [faculty.id, type || "uhf_scan", message || `RFID scanned: ${normalizedTag}`]
          );
        } catch (innerErr) {
          console.warn("notifications insert for registered scan failed:", innerErr.message || innerErr);
        }

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }

      return res.status(201).json({ success: true, registered: true, faculty });
    }

    // UNREGISTERED TAG FLOW
    // Store in-memory and persist to file (NOT in Postgres)
    const event = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      tag: normalizedTag,
      type: type || "not_registered",
      message: message || `Unregistered RFID scanned: ${normalizedTag}`,
      created_at: new Date().toISOString()
    };

    unregisteredScans.unshift(event);
    if (unregisteredScans.length > 1000) {
      unregisteredScans = unregisteredScans.slice(0, 1000);
    }
    saveUnregistered();

    return res.status(201).json({ success: true, registered: false, event });
  } catch (err) {
    console.error("Error handling /rfid/scan:", err);
    return res.status(500).json({ error: "Server error processing RFID scan" });
  }
});

/**
 * GET /rfid/unregistered
 * List all unregistered RFID scans (from in-memory store)
 * Returns: Array of unregistered scan events
 */
app.get("/rfid/unregistered", (req, res) => {
  res.json(unregisteredScans);
});

/**
 * DELETE /rfid/unregistered
 * Clear all unregistered RFID scans
 * Returns: { success: true, cleared: true }
 */
app.delete("/rfid/unregistered", (req, res) => {
  unregisteredScans = [];
  saveUnregistered();
  res.json({ success: true, cleared: true });
});

// ===============================
// AUTHENTICATION
// ===============================

/**
 * POST /login
 * Authenticate faculty using username (email) and password
 * Body: { username: string, password: string }
 * Returns: { success: true, faculty: object }
 */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const q = `
      SELECT fa.faculty_id AS auth_faculty_id, fa.username AS auth_username, fa.password AS auth_password,
             f.id AS faculty_id, f.first_name, f.last_name, f.email, f.rfid, f.titles, f.photo, f.department
      FROM faculty_auth fa
      JOIN faculty f ON fa.faculty_id = f.id
      WHERE TRIM(LOWER(fa.username)) = TRIM(LOWER($1))
      LIMIT 1
    `;
    const userResult = await pool.query(q, [username]);
    
    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = userResult.rows[0];
    const valid = user.auth_password 
      ? await bcrypt.compare(password, user.auth_password) 
      : false;
      
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const facultyInfo = {
      id: user.faculty_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      rfid: user.rfid,
      titles: user.titles,
      photo: user.photo,
      department: user.department,
      username: user.auth_username,
    };
    
    res.json({ success: true, faculty: facultyInfo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ===============================
// DASHBOARD / ANALYTICS ENDPOINTS
// ===============================

/**
 * GET /api/faculty/count
 * Get total count of faculty members
 * Returns: { total: number }
 */
app.get("/api/faculty/count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM faculty");
    res.json({ total: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/departments/count
 * Get total count of departments
 * Returns: { total: number }
 */
app.get("/api/departments/count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM departments");
    res.json({ total: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/departments
 * List all department names
 * Returns: Array of department name strings
 */
app.get("/api/departments", async (req, res) => {
  try {
    const result = await pool.query("SELECT department_name FROM departments");
    res.json(result.rows.map(row => row.department_name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/consultations/count
 * Get total count of consultations
 * Returns: { total: number }
 */
app.get("/api/consultations/count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM consultations");
    res.json({ total: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/consultations/monthly
 * Get monthly consultation counts
 * Returns: Array of { month: string, count: string }
 */
app.get("/api/consultations/monthly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
      FROM consultations
      GROUP BY month
      ORDER BY month
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/faculty/status-counts
 * Get count of faculty by status
 * Returns: { active: number, busy: number, offline: number }
 */
app.get("/api/faculty/status-counts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM user_status
      GROUP BY status
    `);
    const counts = { active: 0, busy: 0, offline: 0 };
    result.rows.forEach(row => {
      counts[row.status.toLowerCase()] = parseInt(row.count, 10);
    });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/notifications
 * Get last 50 notifications with faculty details
 * Returns: Array of notification objects with joined faculty data
 */
app.get("/api/notifications", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        n.id AS notification_id,
        n.type,
        n.message,
        n.created_at,
        f.first_name,
        f.last_name,
        f.rfid,
        f.department
      FROM notifications n
      LEFT JOIN faculty f ON n.faculty_id = f.id
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// SCHEDULED JOBS
// ===============================

/**
 * Auto-offline job: Set all faculty to Offline at 9:00 PM Philippine Time daily
 * Runs every minute and checks if it's 9:00 PM
 */
cron.schedule('* * * * *', async () => {
  try {
    // Get current time in Philippine timezone (Asia/Manila)
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const hour = phTime.getHours();
    const minute = phTime.getMinutes();
    
    // Check if it's exactly 9:00 PM (21:00)
    if (hour === 21 && minute === 0) {
      console.log('⏰ Auto-offline: Setting all faculty to Offline at 9:00 PM Philippine time...');
      
      const result = await pool.query(
        `UPDATE user_status 
         SET status = 'Offline', last_updated = NOW()
         WHERE status != 'Offline'
         RETURNING faculty_id`
      );
      
      // Log notification for each faculty that was set to offline
      if (result.rowCount > 0) {
        for (const row of result.rows) {
          try {
            await pool.query(
              `INSERT INTO notifications (faculty_id, type, message, created_at) 
               VALUES ($1, 'auto_offline', 'Status automatically set to Offline at 9:00 PM', NOW())`,
              [row.faculty_id]
            );
          } catch (notifErr) {
            console.warn('Failed to insert auto-offline notification:', notifErr.message);
          }
        }
        console.log(`✓ Auto-offline: ${result.rowCount} faculty member(s) set to Offline`);
      } else {
        console.log('✓ Auto-offline: All faculty already offline');
      }
    }
  } catch (err) {
    console.error('Error in auto-offline cron job:', err);
  }
}, {
  timezone: 'Asia/Manila'
});

console.log('✓ Cron job scheduled: Auto-offline at 9:00 PM Philippine time');

// ===============================
// SERVER STARTUP & SHUTDOWN
// ===============================

const PORT = parseInt(process.env.PORT || "5000", 10);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown handler
process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  server.close(() => process.exit(0));
});