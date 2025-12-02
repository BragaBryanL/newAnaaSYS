-- ============================================
-- ANAA SYSTEM - DATABASE SETUP
-- Database: backend
-- ============================================

-- Table: faculty
CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_initial VARCHAR(10),
    last_name VARCHAR(100) NOT NULL,
    titles TEXT[],
    email VARCHAR(255) UNIQUE NOT NULL,
    rfid VARCHAR(50) UNIQUE,
    department VARCHAR(100) NOT NULL,
    photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: faculty_auth
CREATE TABLE IF NOT EXISTS faculty_auth (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER UNIQUE NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_status
CREATE TABLE IF NOT EXISTS user_status (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER UNIQUE NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'Offline' CHECK (status IN ('Active', 'Busy', 'Offline')),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: consultations
CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER REFERENCES faculty(id) ON DELETE CASCADE,
    student_name VARCHAR(200) NOT NULL,
    student_id VARCHAR(50),
    course VARCHAR(100),
    year_level VARCHAR(20),
    consultation_type VARCHAR(50) DEFAULT 'General',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    department VARCHAR(100),
    rfid VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('faculty_created', 'faculty_updated', 'status_change', 'uhf_scan', 'not_registered', 'consultation', 'system')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: rfid_logs
CREATE TABLE IF NOT EXISTS rfid_logs (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    tag_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_faculty_email ON faculty(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_faculty_rfid ON faculty(UPPER(TRIM(rfid)));
CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty(department);
CREATE INDEX IF NOT EXISTS idx_faculty_auth_username ON faculty_auth(LOWER(TRIM(username)));
CREATE INDEX IF NOT EXISTS idx_user_status_faculty_id ON user_status(faculty_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfid_logs_created_at ON rfid_logs(created_at DESC);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_faculty_updated_at ON faculty;
CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_faculty_auth_updated_at ON faculty_auth;
CREATE TRIGGER update_faculty_auth_updated_at BEFORE UPDATE ON faculty_auth FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert departments
INSERT INTO departments (department_name, description) VALUES
('IT', 'Information Technology'),
('DS', 'Data Science'),
('CS', 'Computer Science'),
('TCM', 'Technology Communication Management')
ON CONFLICT (department_name) DO NOTHING;
