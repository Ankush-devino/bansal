import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { Evidence, ApiResponse } from "@shared/types";

const router = Router();

// Get all evidence
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, type, status } = req.query;
    let sql = "SELECT * FROM evidence WHERE 1=1";
    const params: any[] = [];

    if (case_id) { sql += " AND case_id = ?"; params.push(case_id); }
    if (type)    { sql += " AND type = ?";    params.push(type); }
    if (status)  { sql += " AND status = ?";  params.push(status); }
    sql += " ORDER BY uploaded_date DESC";

    const rows = await query<Evidence>(sql, params);
    const response: ApiResponse<Evidence[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get single evidence
router.get(
  "/:evidenceId",
  asyncHandler(async (req: Request, res: Response) => {
    const { evidenceId } = req.params;
    const rows = await query<Evidence>(
      "SELECT * FROM evidence WHERE evidence_id = ?",
      [evidenceId]
    );
    if (rows.length === 0) throw new ApiError(404, `Evidence ${evidenceId} not found`);

    const response: ApiResponse<Evidence> = { success: true, data: rows[0] };
    res.json(response);
  })
);

// Upload new evidence
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, type, description, uploaded_by } = req.body;

    if (!case_id || !type) throw new ApiError(400, "case_id and type are required");

    // Verify case exists
    const caseRows = await query("SELECT case_id FROM cases WHERE case_id = ?", [case_id]);
    if (caseRows.length === 0) throw new ApiError(404, `Case ${case_id} not found`);

    // Generate evidence ID
    const countRows = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM evidence WHERE case_id = ?",
      [case_id]
    );
    const evidenceNumber = Number(countRows[0].count) + 1;
    const evidence_id = `${case_id}-EV-${String(evidenceNumber).padStart(3, "0")}`;

    await insert(
      `INSERT INTO evidence (evidence_id, case_id, type, description, uploaded_by, status)
       VALUES (?, ?, ?, ?, ?, 'Pending Analysis')`,
      [evidence_id, case_id, type, description || null, uploaded_by || "System"]
    );

    // Update case evidence count
    await query(
      "UPDATE cases SET evidence_count = evidence_count + 1 WHERE case_id = ?",
      [case_id]
    );

    // Log to audit trail
    await insert(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        `AUDIT-${Date.now()}`,
        "Evidence Uploaded",
        uploaded_by || "System",
        "Evidence",
        evidence_id,
        `Evidence uploaded: ${type} for case ${case_id}`,
      ]
    );

    const rows = await query<Evidence>(
      "SELECT * FROM evidence WHERE evidence_id = ?",
      [evidence_id]
    );
    const response: ApiResponse<Evidence> = {
      success: true,
      data: rows[0],
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

    await query(
      `UPDATE evidence
       SET analysis_status = ?, confidence_score = ?, status = 'Analyzed', blockchain_hash = ?
       WHERE evidence_id = ?`,
      [analysis_status || null, confidence_score || null, blockchain_hash || null, evidenceId]
    );

    const rows = await query<Evidence>(
      "SELECT * FROM evidence WHERE evidence_id = ?",
      [evidenceId]
    );
    if (rows.length === 0) throw new ApiError(404, `Evidence ${evidenceId} not found`);

    const response: ApiResponse<Evidence> = {
      success: true,
      data: rows[0],
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
    const rows = await query("SELECT evidence_id FROM evidence WHERE evidence_id = ?", [evidenceId]);
    if (rows.length === 0) throw new ApiError(404, `Evidence ${evidenceId} not found`);

    await query("DELETE FROM evidence WHERE evidence_id = ?", [evidenceId]);
    const response: ApiResponse<any> = { success: true, message: "Evidence deleted successfully" };
    res.json(response);
  })
);

export default router;
