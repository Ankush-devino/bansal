import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { Case, ApiResponse } from "@shared/types";

const router = Router();

// Get all cases
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string;
    let sql = "SELECT * FROM cases ORDER BY created_date DESC";
    const params: any[] = [];

    if (status) {
      sql = "SELECT * FROM cases WHERE status = ? ORDER BY created_date DESC";
      params.push(status);
    }

    const rows = await query<Case>(sql, params);
    const response: ApiResponse<Case[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get single case
router.get(
  "/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const rows = await query<Case>("SELECT * FROM cases WHERE case_id = ?", [caseId]);

    if (rows.length === 0) throw new ApiError(404, `Case ${caseId} not found`);

    const response: ApiResponse<Case> = { success: true, data: rows[0] };
    res.json(response);
  })
);

// Create new case
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, priority, assigned_to, created_by } = req.body;

    if (!title) throw new ApiError(400, "Title is required");

    // Generate case ID
    const countRows = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM cases WHERE DATE(created_date) = CURDATE()"
    );
    const caseNumber = Number(countRows[0].count) + 1;
    const case_id = `CASE-${new Date().getFullYear()}-${String(caseNumber).padStart(3, "0")}`;

    await insert(
      `INSERT INTO cases (case_id, title, description, priority, assigned_to, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [case_id, title, description || null, priority || "Medium", assigned_to || null, created_by || "System"]
    );

    // Log to audit trail
    await insert(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [`AUDIT-${Date.now()}`, "Case Created", created_by || "System", "Case", case_id, `New case created: ${title}`]
    );

    const rows = await query<Case>("SELECT * FROM cases WHERE case_id = ?", [case_id]);
    const response: ApiResponse<Case> = {
      success: true,
      data: rows[0],
      message: "Case created successfully",
    };
    res.status(201).json(response);
  })
);

// Update case
router.put(
  "/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const { title, description, status, priority, assigned_to } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined)       { updates.push("title = ?");       values.push(title); }
    if (description !== undefined) { updates.push("description = ?"); values.push(description); }
    if (status !== undefined)      { updates.push("status = ?");      values.push(status); }
    if (priority !== undefined)    { updates.push("priority = ?");    values.push(priority); }
    if (assigned_to !== undefined) { updates.push("assigned_to = ?"); values.push(assigned_to); }

    if (updates.length === 0) throw new ApiError(400, "No fields to update");

    values.push(caseId);
    await query(`UPDATE cases SET ${updates.join(", ")} WHERE case_id = ?`, values);

    const rows = await query<Case>("SELECT * FROM cases WHERE case_id = ?", [caseId]);
    if (rows.length === 0) throw new ApiError(404, `Case ${caseId} not found`);

    const response: ApiResponse<Case> = {
      success: true,
      data: rows[0],
      message: "Case updated successfully",
    };
    res.json(response);
  })
);

// Delete case
router.delete(
  "/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const rows = await query<Case>("SELECT * FROM cases WHERE case_id = ?", [caseId]);
    if (rows.length === 0) throw new ApiError(404, `Case ${caseId} not found`);

    await query("DELETE FROM cases WHERE case_id = ?", [caseId]);
    const response: ApiResponse<any> = { success: true, message: "Case deleted successfully" };
    res.json(response);
  })
);

// Get case statistics
router.get(
  "/:caseId/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;

    const [caseRows, evidenceRows, assignmentRows] = await Promise.all([
      query("SELECT * FROM cases WHERE case_id = ?", [caseId]),
      query<{ count: number }>("SELECT COUNT(*) as count FROM evidence WHERE case_id = ?", [caseId]),
      query<{ count: number }>(
        "SELECT COUNT(*) as count FROM case_assignments WHERE case_id = ? AND status = 'Active'",
        [caseId]
      ),
    ]);

    if (caseRows.length === 0) throw new ApiError(404, `Case ${caseId} not found`);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        case: caseRows[0],
        evidence_count: evidenceRows[0].count,
        active_assignments: assignmentRows[0].count,
      },
    };
    res.json(response);
  })
);

export default router;
