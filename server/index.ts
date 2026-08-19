import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase, query } from "./db";
import { errorHandler } from "./middleware/errorHandler";
import casesRouter from "./routes/cases";
import evidenceRouter from "./routes/evidence";
import officersRouter from "./routes/officers";
import blockchainRouter from "./routes/blockchain";
import assignmentRouter from "./routes/assignment";
import analyticsRouter from "./routes/analytics";
import biometricRouter from "./routes/biometric";

dotenv.config();

export function createServer(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use("/api/cases", casesRouter);
  app.use("/api/evidence", evidenceRouter);
  app.use("/api/officers", officersRouter);
  app.use("/api/blockchain", blockchainRouter);
  app.use("/api/assignment", assignmentRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/biometric", biometricRouter);

  // Dashboard statistics endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const [casesResult, evidenceResult, patternResult, auditResult] = await Promise.all([
        query<any>(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
            AVG(resolution_time_days) as avg_time
          FROM cases`
        ),
        query<{ total: number }>("SELECT COUNT(*) as total FROM evidence"),
        query<{ today: number }>(
          "SELECT COUNT(*) as today FROM pattern_matches WHERE DATE(created_date) = CURDATE()"
        ),
        query<{ verified: number }>(
          "SELECT COUNT(*) as verified FROM audit_trail WHERE verified = TRUE"
        ),
      ]);

      const stats = {
        total_cases: casesResult[0].total,
        active_cases: casesResult[0].active,
        completed_cases: casesResult[0].completed,
        total_evidence: evidenceResult[0].total,
        pattern_matches_today: patternResult[0].today,
        blockchain_verified_entries: auditResult[0].verified,
        average_resolution_time: casesResult[0].avg_time,
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch statistics" });
    }
  });

  // Error handling middleware
  app.use(errorHandler);

  return app;
}

// Insert sample data
async function insertSampleData() {
  try {
    // Check if data already exists
    const existingOfficers = await query<{ count: number }>("SELECT COUNT(*) as count FROM officers");
    if (Number(existingOfficers[0].count) > 0) {
      console.log("Sample data already exists");
      return;
    }

    console.log("Inserting sample data...");

    // Insert sample officers
    const officers = [
      {
        officer_id: "OFF-0001",
        name: "Officer Smith",
        specialization: "Fingerprint Specialist",
        email: "smith@police.local",
        location: "Downtown",
        experience_years: 8,
        success_rate: 94.5,
      },
      {
        officer_id: "OFF-0002",
        name: "Officer Johnson",
        specialization: "Digital Forensics",
        email: "johnson@police.local",
        location: "Central Station",
        experience_years: 6,
        success_rate: 92.0,
      },
      {
        officer_id: "OFF-0003",
        name: "Officer Davis",
        specialization: "DNA Analysis",
        email: "davis@police.local",
        location: "Lab District",
        experience_years: 10,
        success_rate: 96.2,
      },
    ];

    for (const officer of officers) {
      await query(
        `INSERT IGNORE INTO officers (officer_id, name, specialization, email, location, experience_years, success_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [officer.officer_id, officer.name, officer.specialization, officer.email, officer.location, officer.experience_years, officer.success_rate]
      );
    }

    // Insert sample cases
    const cases = [
      {
        case_id: "CASE-2024-001",
        title: "Breaking and Entering - Downtown",
        description: "Residential burglary with multiple evidence items",
        priority: "High",
        assigned_to: "Officer Smith",
        status: "In Progress",
        created_by: "Detective Garcia",
      },
      {
        case_id: "CASE-2024-002",
        title: "Digital Fraud Investigation",
        description: "Large-scale financial fraud case",
        priority: "Critical",
        assigned_to: "Officer Johnson",
        status: "In Progress",
        created_by: "Detective Martinez",
      },
    ];

    for (const caseData of cases) {
      await query(
        `INSERT IGNORE INTO cases (case_id, title, description, priority, assigned_to, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [caseData.case_id, caseData.title, caseData.description, caseData.priority, caseData.assigned_to, caseData.status, caseData.created_by]
      );
    }

    console.log("Sample data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data:", error);
  }
}

// Server initialization (only runs when executed directly)
async function startServer() {
  try {
    // Only initialize database in production or if explicitly requested
    if (process.env.NODE_ENV === "production" || process.env.INIT_DB === "true") {
      try {
        await initializeDatabase();
        console.log("Database initialized successfully");

        // Insert sample data for demonstration
        await insertSampleData();
      } catch (error) {
        console.warn("Database initialization skipped:", error instanceof Error ? error.message : error);
      }
    } else {
      console.log("Database initialization skipped (development mode)");
    }

    const app = createServer();
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API Base URL: http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    // Don't exit - let Vite handle this
  }
}

// Server initialization (only runs when executed directly)
if (process.argv[1] && (process.argv[1].endsWith("server/index.ts") || process.argv[1].endsWith("server\\index.ts") || process.argv[1].endsWith("node-build.mjs"))) {
  startServer();
}
