import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// ── Connection Pool ────────────────────────────────────────────────────────────

let pool: mysql.Pool;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "forensicai",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  console.log("[DB] MySQL pool created for database:", process.env.DB_NAME || "forensicai");
} catch (err: any) {
  console.warn("[DB] Failed to create MySQL pool:", err.message);
  pool = {
    query: async () => { throw new Error("Database not available"); },
    execute: async () => { throw new Error("Database not available"); },
    end: async () => {},
    getConnection: async () => { throw new Error("Database not available"); },
  } as any;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Execute a query and return rows array.
 * mysql2/promise returns [rows, fields] — we extract rows here for convenience.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/**
 * Execute an INSERT and return the auto-increment insert ID.
 */
export async function insert(sql: string, params: any[] = []): Promise<number> {
  const [result] = await pool.execute(sql, params) as any;
  return result.insertId as number;
}

// ── Schema Initialisation ──────────────────────────────────────────────────────

export async function initializeDatabase() {
  console.log("Initializing MySQL database schema...");

  // Cases table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS cases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'Pending',
      priority VARCHAR(50) DEFAULT 'Medium',
      assigned_to VARCHAR(255),
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      resolution_time_days INT,
      evidence_count INT DEFAULT 0
    )
  `);

  // Evidence table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS evidence (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
      FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    )
  `);

  // Officers table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS officers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      officer_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      specialization VARCHAR(255),
      caseload INT DEFAULT 0,
      success_rate DECIMAL(5,2),
      location VARCHAR(255),
      experience_years INT,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(20),
      active BOOLEAN DEFAULT TRUE,
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Case assignments table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS case_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id VARCHAR(50) NOT NULL,
      officer_id VARCHAR(50) NOT NULL,
      assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      match_score DECIMAL(5,2),
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
      FOREIGN KEY (officer_id) REFERENCES officers(officer_id) ON DELETE CASCADE
    )
  `);

  // Biometric results table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS biometric_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      result_id VARCHAR(50) UNIQUE NOT NULL,
      case_id VARCHAR(50) NOT NULL,
      evidence_id VARCHAR(50),
      suspect_id VARCHAR(50),
      suspect_name VARCHAR(255),
      match_score DECIMAL(5,2),
      consensus_result VARCHAR(255),
      verified BOOLEAN DEFAULT FALSE,
      fingerprint_confidence DECIMAL(5,2),
      facial_confidence DECIMAL(5,2),
      iris_confidence DECIMAL(5,2),
      voice_confidence DECIMAL(5,2),
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    )
  `);

  // Reports table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id VARCHAR(50) UNIQUE NOT NULL,
      case_id VARCHAR(50) NOT NULL,
      type VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Pending Review',
      pages INT,
      ai_generated BOOLEAN DEFAULT TRUE,
      reviewed BOOLEAN DEFAULT FALSE,
      reviewed_by VARCHAR(255),
      content TEXT,
      generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_date TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    )
  `);

  // Audit trail table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entry_id VARCHAR(50) UNIQUE NOT NULL,
      action VARCHAR(100) NOT NULL,
      actor VARCHAR(255),
      target_type VARCHAR(50),
      target_id VARCHAR(50),
      details TEXT,
      block_hash VARCHAR(255),
      verified BOOLEAN DEFAULT FALSE,
      signature VARCHAR(255),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pattern matches table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS pattern_matches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      current_case_id VARCHAR(50) NOT NULL,
      matched_case_id VARCHAR(50),
      similarity_score DECIMAL(5,2),
      pattern_type VARCHAR(100),
      description TEXT,
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (current_case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    )
  `);

  // Indexes
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)`).catch(() => {});
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases(assigned_to)`).catch(() => {});
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id)`).catch(() => {});
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type)`).catch(() => {});
  await pool.execute(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp)`).catch(() => {});

  console.log("MySQL schema initialized successfully.");
}

export default pool;
