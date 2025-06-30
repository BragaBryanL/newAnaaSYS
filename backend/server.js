require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "backend",
    password: "admin123",
    port: 5432,
});

// Fetch all faculty with status
app.get("/faculty", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT f.*, us.status, us.last_updated
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

// Register new faculty (with notification)
app.post("/faculty/add", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const {
            firstName, middleInitials, lastName, titles,
            email, rfid, department, password, photo
        } = req.body;

        // Check if faculty already exists
        const existingFaculty = await client.query(
            "SELECT * FROM faculty WHERE email = $1 OR rfid = $2",
            [email, rfid]
        );
        if (existingFaculty.rowCount > 0) {
            return res.status(400).json({ success: false, message: "Email or RFID already in use" });
        }

        // Insert faculty info
        const facultyResult = await client.query(
            `INSERT INTO faculty (first_name, middle_initial, last_name, titles, email, rfid, department, photo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [firstName, middleInitials, lastName, titles, email, rfid, department, photo]
        );
        const facultyId = facultyResult.rows[0].id;

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store faculty login credentials
        await client.query(
            "INSERT INTO faculty_auth (faculty_id, username, password) VALUES ($1, $2, $3)",
            [facultyId, email, hashedPassword]
        );

        // Initialize default status
        await client.query(
            "INSERT INTO user_status (faculty_id, status) VALUES ($1, 'Active')",
            [facultyId]
        );

        // Insert notification for faculty creation
        await client.query(
            "INSERT INTO notifications (faculty_id, type, message) VALUES ($1, 'faculty_created', 'Faculty successfully created.')",
            [facultyId]
        );

        await client.query("COMMIT");
        res.json({ success: true, message: "Faculty registered successfully", faculty: facultyResult.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Error registering faculty" });
    } finally {
        client.release();
    }
});

// Update faculty info (with notification)
app.put("/faculty/:id", async (req, res) => {
    const { id } = req.params;
    const {
        firstName, middleInitials, lastName, titles,
        email, rfid, department, photo, password
    } = req.body;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Update faculty info
        const facultyResult = await client.query(
            `UPDATE faculty
             SET first_name = $1, middle_initial = $2, last_name = $3, titles = $4,
                 email = $5, rfid = $6, department = $7, photo = $8
             WHERE id = $9
             RETURNING *`,
            [firstName, middleInitials, lastName, titles, email, rfid, department, photo, id]
        );

        // If password is provided and not empty, update it
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            await client.query(
                "UPDATE faculty_auth SET password = $1 WHERE faculty_id = $2",
                [hashedPassword, id]
            );
        }

        // Insert notification for faculty update
        await client.query(
            "INSERT INTO notifications (faculty_id, type, message) VALUES ($1, 'faculty_updated', 'Faculty profile updated.')",
            [id]
        );

        await client.query("COMMIT");
        res.json({ success: true, faculty: facultyResult.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Error updating faculty" });
    } finally {
        client.release();
    }
});

// Update faculty status (with notification)
app.patch("/faculty/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await pool.query(
            "UPDATE user_status SET status = $1, last_updated = NOW() WHERE faculty_id = $2 RETURNING *",
            [status, id]
        );
        // Insert notification for status change
        await pool.query(
            "INSERT INTO notifications (faculty_id, type, message) VALUES ($1, 'status_change', $2)",
            [id, `Status changed to ${status}`]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error updating status" });
    }
});

// Delete faculty (with notification)
app.delete("/faculty/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Insert notification for faculty deletion
        await client.query(
            "INSERT INTO notifications (faculty_id, type, message) VALUES ($1, 'faculty_deleted', 'Faculty profile deleted.')",
            [id]
        );
        await client.query("DELETE FROM faculty WHERE id = $1", [id]);
        await client.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Login endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // Find faculty by email or username
        const userResult = await pool.query(
            "SELECT fa.*, f.* FROM faculty_auth fa JOIN faculty f ON fa.faculty_id = f.id WHERE fa.username = $1",
            [username]
        );
        if (userResult.rowCount === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        const user = userResult.rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        // Return faculty info (omit password)
        const { password: _, ...facultyInfo } = user;
        res.json({ success: true, faculty: facultyInfo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login" });
    }
});

// --- DASHBOARD ENDPOINTS ---

// Faculty count
app.get("/api/faculty/count", async (req, res) => {
    const result = await pool.query("SELECT COUNT(*) FROM faculty");
    res.json({ total: parseInt(result.rows[0].count, 10) });
});

// Department count
app.get("/api/departments/count", async (req, res) => {
    const result = await pool.query("SELECT COUNT(*) FROM departments");
    res.json({ total: parseInt(result.rows[0].count, 10) });
});

// All department names
app.get("/api/departments", async (req, res) => {
    const result = await pool.query("SELECT department_name FROM departments");
    res.json(result.rows.map(row => row.department_name));
});

// Consultation count
app.get("/api/consultations/count", async (req, res) => {
    const result = await pool.query("SELECT COUNT(*) FROM consultations");
    res.json({ total: parseInt(result.rows[0].count, 10) });
});

// Monthly consultations for graph
app.get("/api/consultations/monthly", async (req, res) => {
    const result = await pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
        FROM consultations
        GROUP BY month
        ORDER BY month
    `);
    res.json(result.rows);
});

// Faculty status counts (active, busy, offline)
app.get("/api/faculty/status-counts", async (req, res) => {
    const result = await pool.query(`
        SELECT status, COUNT(*) AS count
        FROM user_status
        GROUP BY status
    `);
    // Convert to { active: X, busy: Y, offline: Z }
    const counts = { active: 0, busy: 0, offline: 0 };
    result.rows.forEach(row => {
        counts[row.status.toLowerCase()] = parseInt(row.count, 10);
    });
    res.json(counts);
});

// Notifications (latest 20)
app.get("/api/notifications", async (req, res) => {
    const result = await pool.query(`
        SELECT n.*, f.first_name, f.last_name, f.rfid, f.department
        FROM notifications n
        JOIN faculty f ON n.faculty_id = f.id
        ORDER BY n.created_at DESC
        LIMIT 20
    `);
    res.json(result.rows);
});

app.listen(5000, "0.0.0.0", () => {
    console.log("Backend running on 192.168.0.101:5000");
});

