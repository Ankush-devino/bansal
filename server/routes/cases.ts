import { Router, Request, Response } from "express";
import pool from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { Case, ApiResponse } from "@shared/types";

const router = Router();

// Get all cases
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string;
    let query = "SELECT * FROM cases ORDER BY created_date DESC";
    const params: any[] = [];

    if (status) {
      query = "SELECT * FROM cases WHERE status = $1 ORDER BY created_date DESC";
      params.push(status);
    }

    const result = await pool.query(query, params);
    const response: ApiResponse<Case[]> = {
      success: true,
      data: result.rows as Case[],
    };
    res.json(response);
  })
);

// Get single case
router.get(
  "/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;

    const result = await pool.query("SELECT * FROM cases WHERE case_id = $1", [caseId]);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Case ${caseId} not found`);
    }

    const response: ApiResponse<Case> = {
      success: true,
      data: result.rows[0] as Case,
    };
    res.json(response);
  })
);

// Create new case
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, priority, assigned_to, created_by } = req.body;

    if (!title) {
      throw new ApiError(400, "Title is required");
    }

    // Generate case ID
    const caseIdResult = await pool.query(
      "SELECT COUNT(*) as count FROM cases WHERE created_date >= CURRENT_DATE"
    );
    const caseNumber = (caseIdResult.rows[0].count as number) + 1;
    const case_id = `CASE-${new Date().getFullYear()}-${String(caseNumber).padStart(3, "0")}`;

    const result = await pool.query(
      `INSERT INTO cases (case_id, title, description, priority, assigned_to, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING *`,
      [case_id, title, description || null, priority || "Medium", assigned_to || null, created_by || "System"]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        `AUDIT-${Date.now()}`,
        "Case Created",
        created_by || "System",
        "Case",
        case_id,
        `New case created: ${title}`,
      ]
    );

    const response: ApiResponse<Case> = {
      success: true,
      data: result.rows[0] as Case,
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
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(assigned_to);
    }

    updates.push(`updated_date = CURRENT_TIMESTAMP`);
    values.push(caseId);

    const result = await pool.query(
      `UPDATE cases SET ${updates.join(", ")} WHERE case_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Case ${caseId} not found`);
    }

    const response: ApiResponse<Case> = {
      success: true,
      data: result.rows[0] as Case,
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

    const result = await pool.query("DELETE FROM cases WHERE case_id = $1 RETURNING *", [
      caseId,
    ]);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Case ${caseId} not found`);
    }

    const response: ApiResponse<any> = {
      success: true,
      message: "Case deleted successfully",
    };
    res.json(response);
  })
);

// Get case statistics
router.get(
  "/:caseId/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;

    const [caseResult, evidenceResult, assignmentResult] = await Promise.all([
      pool.query("SELECT * FROM cases WHERE case_id = $1", [caseId]),
      pool.query("SELECT COUNT(*) as count FROM evidence WHERE case_id = $1", [caseId]),
      pool.query(
        `SELECT COUNT(*) as count FROM case_assignments WHERE case_id = $1 AND status = 'Active'`,
        [caseId]
      ),
    ]);

    if (caseResult.rows.length === 0) {
      throw new ApiError(404, `Case ${caseId} not found`);
    }

    const stats = {
      case: caseResult.rows[0],
      evidence_count: evidenceResult.rows[0].count,
      active_assignments: assignmentResult.rows[0].count,
    };

    const response: ApiResponse<any> = {
      success: true,
      data: stats,
    };
    res.json(response);
  })
);

export default router;
