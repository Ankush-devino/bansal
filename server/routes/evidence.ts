import { Router, Request, Response } from "express";
import pool from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { Evidence, ApiResponse } from "@shared/types";

const router = Router();

// Get all evidence
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, type, status } = req.query;
    let query = "SELECT * FROM evidence WHERE 1=1";
    const params: any[] = [];
    let paramCount = 1;

    if (case_id) {
      query += ` AND case_id = $${paramCount++}`;
      params.push(case_id);
    }
    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }
    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    query += " ORDER BY uploaded_date DESC";

    const result = await pool.query(query, params);
    const response: ApiResponse<Evidence[]> = {
      success: true,
      data: result.rows as Evidence[],
    };
    res.json(response);
  })
);

// Get single evidence
router.get(
  "/:evidenceId",
  asyncHandler(async (req: Request, res: Response) => {
    const { evidenceId } = req.params;

    const result = await pool.query("SELECT * FROM evidence WHERE evidence_id = $1", [
      evidenceId,
    ]);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Evidence ${evidenceId} not found`);
    }

    const response: ApiResponse<Evidence> = {
      success: true,
      data: result.rows[0] as Evidence,
    };
    res.json(response);
  })
);

// Upload new evidence
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, type, description, uploaded_by } = req.body;

    if (!case_id || !type) {
      throw new ApiError(400, "case_id and type are required");
    }

    // Verify case exists
    const caseResult = await pool.query("SELECT * FROM cases WHERE case_id = $1", [case_id]);
    if (caseResult.rows.length === 0) {
      throw new ApiError(404, `Case ${case_id} not found`);
    }

    // Generate evidence ID
    const evidenceCountResult = await pool.query(
      "SELECT COUNT(*) as count FROM evidence WHERE case_id = $1",
      [case_id]
    );
    const evidenceNumber = (evidenceCountResult.rows[0].count as number) + 1;
    const evidence_id = `${case_id}-EV-${String(evidenceNumber).padStart(3, "0")}`;

    const result = await pool.query(
      `INSERT INTO evidence (evidence_id, case_id, type, description, uploaded_by, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending Analysis')
       RETURNING *`,
      [evidence_id, case_id, type, description || null, uploaded_by || "System"]
    );

    // Update case evidence count
    await pool.query("UPDATE cases SET evidence_count = evidence_count + 1 WHERE case_id = $1", [
      case_id,
    ]);

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        `AUDIT-${Date.now()}`,
        "Evidence Uploaded",
        uploaded_by || "System",
        "Evidence",
        evidence_id,
        `Evidence uploaded: ${type}`,
      ]
    );

    const response: ApiResponse<Evidence> = {
      success: true,
      data: result.rows[0] as Evidence,
      message: "Evidence uploaded successfully",
    };
    res.status(201).json(response);
  })
);

// Update evidence analysis status
router.put(
  "/:evidenceId/analysis",
  asyncHandler(async (req: Request, res: Response) => {
    const { evidenceId } = req.params;
    const { analysis_status, confidence_score, blockchain_hash } = req.body;

    const result = await pool.query(
      `UPDATE evidence 
       SET analysis_status = $1, confidence_score = $2, status = 'Analyzed', blockchain_hash = $3
       WHERE evidence_id = $4
       RETURNING *`,
      [analysis_status || null, confidence_score || null, blockchain_hash || null, evidenceId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Evidence ${evidenceId} not found`);
    }

    const response: ApiResponse<Evidence> = {
      success: true,
      data: result.rows[0] as Evidence,
      message: "Evidence analysis updated",
    };
    res.json(response);
  })
);

// Delete evidence
router.delete(
  "/:evidenceId",
  asyncHandler(async (req: Request, res: Response) => {
    const { evidenceId } = req.params;

    const result = await pool.query(
      "DELETE FROM evidence WHERE evidence_id = $1 RETURNING *",
      [evidenceId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Evidence ${evidenceId} not found`);
    }

    const response: ApiResponse<any> = {
      success: true,
      message: "Evidence deleted successfully",
    };
    res.json(response);
  })
);

export default router;
