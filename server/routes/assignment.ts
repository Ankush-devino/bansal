import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { AssignmentRecommendation, ApiResponse } from "@shared/types";

const router = Router();

// Get assignment recommendations for a case
router.get(
  "/recommendations/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;

    const caseRows = await query("SELECT * FROM cases WHERE case_id = ?", [caseId]);
    if (caseRows.length === 0) throw new ApiError(404, `Case ${caseId} not found`);

    const officers = await query(
      `SELECT o.*,
        (SELECT COUNT(*) FROM case_assignments WHERE officer_id = o.officer_id AND status = 'Active') as active_cases
       FROM officers o WHERE o.active = TRUE ORDER BY success_rate DESC`
    );

    const recommendations: AssignmentRecommendation[] = officers.map((officer: any) => {
      let matchScore = 0;

      let specializationScore = 50;
      if (officer.specialization?.toLowerCase().includes("biometric")) specializationScore = 95;
      if (officer.specialization?.toLowerCase().includes("digital"))   specializationScore = 95;
      matchScore += (specializationScore / 100) * 35;

      const maxCaseload = 5;
      const workloadScore = ((maxCaseload - officer.active_cases) / maxCaseload) * 100;
      matchScore += (Math.max(0, Math.min(100, workloadScore)) / 100) * 25;

      matchScore += (officer.success_rate / 100) * 25;

      const proximityScore = 75;
      matchScore += (proximityScore / 100) * 15;

      return {
        officer_id: officer.officer_id,
        name: officer.name,
        specialization: officer.specialization,
        match_score: Math.round(matchScore * 100) / 100,
        caseload: officer.active_cases,
        success_rate: officer.success_rate,
        location: officer.location,
        experience_years: officer.experience_years,
      };
    });

    const response: ApiResponse<AssignmentRecommendation[]> = {
      success: true,
      data: recommendations.sort((a, b) => b.match_score - a.match_score),
    };
    res.json(response);
  })
);

// Assign case to officer
router.post(
  "/assign",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, officer_id, notes } = req.body;

    if (!case_id || !officer_id) throw new ApiError(400, "case_id and officer_id are required");

    const [caseRows, officerRows] = await Promise.all([
      query("SELECT * FROM cases WHERE case_id = ?", [case_id]),
      query("SELECT * FROM officers WHERE officer_id = ?", [officer_id]),
    ]);

    if (caseRows.length === 0) throw new ApiError(404, `Case ${case_id} not found`);
    if (officerRows.length === 0) throw new ApiError(404, `Officer ${officer_id} not found`);

    // Check if already assigned
    const existing = await query(
      "SELECT id FROM case_assignments WHERE case_id = ? AND officer_id = ? AND status = 'Active'",
      [case_id, officer_id]
    );
    if (existing.length > 0) throw new ApiError(400, "Case already assigned to this officer");

    // Match score
    const scoreRows = await query<any>(
      `SELECT
        (SELECT COUNT(*) FROM case_assignments WHERE officer_id = ? AND status = 'Active') as active_cases,
        success_rate, specialization
       FROM officers WHERE officer_id = ?`,
      [officer_id, officer_id]
    );
    const officer = scoreRows[0];
    const matchScore = Math.min(100, (officer.success_rate / 100) * 60 + ((5 - officer.active_cases) / 5) * 40);

    await insert(
      "INSERT INTO case_assignments (case_id, officer_id, match_score, notes) VALUES (?, ?, ?, ?)",
      [case_id, officer_id, matchScore, notes || null]
    );

    await query(
      "UPDATE cases SET assigned_to = ?, status = 'In Progress' WHERE case_id = ?",
      [(officerRows[0] as any).name, case_id]
    );

    await query(
      "UPDATE officers SET caseload = caseload + 1 WHERE officer_id = ?",
      [officer_id]
    );

    await insert(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        `AUDIT-${Date.now()}`,
        "Case Assigned",
        "System",
        "Case",
        case_id,
        `Case assigned to ${(officerRows[0] as any).name}`,
      ]
    );

    const assignmentRows = await query(
      `SELECT ca.*, c.title as case_title, o.name as officer_name, o.specialization
       FROM case_assignments ca
       JOIN cases c ON ca.case_id = c.case_id
       JOIN officers o ON ca.officer_id = o.officer_id
       WHERE ca.case_id = ? AND ca.officer_id = ? AND ca.status = 'Active'
       ORDER BY ca.assigned_date DESC LIMIT 1`,
      [case_id, officer_id]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: assignmentRows[0],
      message: "Case assigned successfully",
    };
    res.status(201).json(response);
  })
);

// Get case assignments
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, officer_id, status } = req.query;
    let sql = `
      SELECT ca.*, c.title as case_title, o.name as officer_name, o.specialization
      FROM case_assignments ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN officers o ON ca.officer_id = o.officer_id
      WHERE 1=1`;
    const params: any[] = [];

    if (case_id)   { sql += " AND ca.case_id = ?";   params.push(case_id); }
    if (officer_id){ sql += " AND ca.officer_id = ?"; params.push(officer_id); }
    if (status)    { sql += " AND ca.status = ?";     params.push(status); }
    sql += " ORDER BY ca.assigned_date DESC";

    const rows = await query(sql, params);
    const response: ApiResponse<any[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Unassign case
router.delete(
  "/:caseId/:officerId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId, officerId } = req.params;

    const rows = await query(
      "SELECT id FROM case_assignments WHERE case_id = ? AND officer_id = ? AND status = 'Active'",
      [caseId, officerId]
    );
    if (rows.length === 0) throw new ApiError(404, "Assignment not found");

    await query(
      "UPDATE case_assignments SET status = 'Inactive' WHERE case_id = ? AND officer_id = ?",
      [caseId, officerId]
    );

    await query(
      "UPDATE officers SET caseload = GREATEST(0, caseload - 1) WHERE officer_id = ?",
      [officerId]
    );

    const response: ApiResponse<any> = { success: true, message: "Case unassigned successfully" };
    res.json(response);
  })
);

export default router;
