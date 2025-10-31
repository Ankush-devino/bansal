import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "forensic_db",
});

// Handle connection errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing database schema...");

    // Cases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id SERIAL PRIMARY KEY,
        case_id VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        priority VARCHAR(50) DEFAULT 'Medium',
        assigned_to VARCHAR(255),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        resolution_time_days INT,
        evidence_count INT DEFAULT 0
      );
    `);

    // Evidence table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evidence (
        id SERIAL PRIMARY KEY,
        evidence_id VARCHAR(50) UNIQUE NOT NULL,
        case_id VARCHAR(50) NOT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending Analysis',
        uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by VARCHAR(255),
        analysis_status VARCHAR(50),
        confidence_score DECIMAL(5,2),
        ipfs_hash VARCHAR(255),
        blockchain_hash VARCHAR(255),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(case_id)
      );
    `);

    // Officers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS officers (
        id SERIAL PRIMARY KEY,
        officer_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        specialization VARCHAR(255),
        caseload INT DEFAULT 0,
        success_rate DECIMAL(5,2),
        location VARCHAR(255),
        experience_years INT,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        active BOOLEAN DEFAULT true,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Case assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS case_assignments (
        id SERIAL PRIMARY KEY,
        case_id VARCHAR(50) NOT NULL,
        officer_id VARCHAR(50) NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        match_score DECIMAL(5,2),
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        FOREIGN KEY (case_id) REFERENCES cases(case_id),
        FOREIGN KEY (officer_id) REFERENCES officers(officer_id)
      );
    `);

    // Biometric results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS biometric_results (
        id SERIAL PRIMARY KEY,
        result_id VARCHAR(50) UNIQUE NOT NULL,
        case_id VARCHAR(50) NOT NULL,
        evidence_id VARCHAR(50),
        suspect_id VARCHAR(50),
        suspect_name VARCHAR(255),
        match_score DECIMAL(5,2),
        consensus_result VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        fingerprint_confidence DECIMAL(5,2),
        facial_confidence DECIMAL(5,2),
        iris_confidence DECIMAL(5,2),
        voice_confidence DECIMAL(5,2),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(case_id)
      );
    `);

    // Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(50) UNIQUE NOT NULL,
        case_id VARCHAR(50) NOT NULL,
        type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending Review',
        pages INT,
        ai_generated BOOLEAN DEFAULT true,
        reviewed BOOLEAN DEFAULT false,
        reviewed_by VARCHAR(255),
        content TEXT,
        generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_date TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(case_id)
      );
    `);

    // Audit trail table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        entry_id VARCHAR(50) UNIQUE NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor VARCHAR(255),
        target_type VARCHAR(50),
        target_id VARCHAR(50),
        details TEXT,
        block_hash VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        signature VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Pattern matches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pattern_matches (
        id SERIAL PRIMARY KEY,
        current_case_id VARCHAR(50) NOT NULL,
        matched_case_id VARCHAR(50),
        similarity_score DECIMAL(5,2),
        pattern_type VARCHAR(100),
        description TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (current_case_id) REFERENCES cases(case_id)
      );
    `);

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);
      CREATE INDEX IF NOT EXISTS idx_biometric_case_id ON biometric_results(case_id);
      CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp);
    `);

    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

export default pool;
