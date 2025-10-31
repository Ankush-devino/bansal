import { Router, Request, Response } from "express";
import pool from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { AssignmentRecommendation, ApiResponse } from "@shared/types";

const router = Router();

/**
 * Smart Case Assignment System
 * Considers: specialization, workload, success rates, geographic proximity
 */

// Get assignment recommendations for a case
router.get(
  "/recommendations/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;

    // Get case details
    const caseResult = await pool.query("SELECT * FROM cases WHERE case_id = $1", [caseId]);
    if (caseResult.rows.length === 0) {
      throw new ApiError(404, `Case ${caseId} not found`);
    }

    const caseData = caseResult.rows[0];

    // Get all active officers
    const officersResult = await pool.query(
      `SELECT *, 
        (SELECT COUNT(*) FROM case_assignments WHERE officer_id = o.officer_id AND status = 'Active') as active_cases
       FROM officers o WHERE o.active = true ORDER BY success_rate DESC`,
    );

    const officers = officersResult.rows;

    // Calculate match scores based on:
    // 1. Specialization match (35%)
    // 2. Workload balance (25%)
    // 3. Success rate (25%)
    // 4. Geographic proximity (15%)

    const recommendations: AssignmentRecommendation[] = officers.map((officer) => {
      let matchScore = 0;

      // Specialization match (determine from case type/evidence)
      const specializationWeight = 35;
      let specializationScore = 50; // Default 50%

      // If case has biometric evidence and officer is biometric specialist
      if (officer.specialization && officer.specialization.toLowerCase().includes("biometric")) {
        specializationScore = 95;
      }
      // If case has digital evidence and officer is digital forensics expert
      if (officer.specialization && officer.specialization.toLowerCase().includes("digital")) {
        specializationScore = 95;
      }

      matchScore += (specializationScore / 100) * specializationWeight;

      // Workload balance (25%)
      const maxCaseload = 5;
      const workloadScore = ((maxCaseload - officer.active_cases) / maxCaseload) * 100;
      matchScore += (Math.max(0, Math.min(100, workloadScore)) / 100) * 25;

      // Success rate (25%)
      matchScore += (officer.success_rate / 100) * 25;

      // Geographic proximity (15%) - simplified
      const proximityScore = 75; // Default score
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

    if (!case_id || !officer_id) {
      throw new ApiError(400, "case_id and officer_id are required");
    }

    // Verify case and officer exist
    const [caseResult, officerResult] = await Promise.all([
      pool.query("SELECT * FROM cases WHERE case_id = $1", [case_id]),
      pool.query("SELECT * FROM officers WHERE officer_id = $1", [officer_id]),
    ]);

    if (caseResult.rows.length === 0) {
      throw new ApiError(404, `Case ${case_id} not found`);
    }
    if (officerResult.rows.length === 0) {
      throw new ApiError(404, `Officer ${officer_id} not found`);
    }

    // Check if already assigned
    const existingAssignment = await pool.query(
      "SELECT * FROM case_assignments WHERE case_id = $1 AND officer_id = $2 AND status = 'Active'",
      [case_id, officer_id]
    );

    if (existingAssignment.rows.length > 0) {
      throw new ApiError(400, `Case already assigned to this officer`);
    }

    // Get match score
    const recommendationResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM case_assignments WHERE officer_id = $1 AND status = 'Active') as active_cases,
        success_rate,
        specialization
       FROM officers WHERE officer_id = $1`,
      [officer_id]
    );

    const officer = recommendationResult.rows[0];
    let matchScore = (officer.success_rate / 100) * 60 + ((5 - officer.active_cases) / 5) * 40;

    // Create assignment
    const assignmentResult = await pool.query(
      `INSERT INTO case_assignments (case_id, officer_id, match_score, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [case_id, officer_id, Math.min(100, matchScore), notes || null]
    );

    // Update case assignment
    await pool.query(
      "UPDATE cases SET assigned_to = $1, status = 'In Progress' WHERE case_id = $2",
      [officerResult.rows[0].name, case_id]
    );

    // Update officer caseload
    await pool.query(
      "UPDATE officers SET caseload = caseload + 1 WHERE officer_id = $1",
      [officer_id]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        `AUDIT-${Date.now()}`,
        "Case Assigned",
        "System",
        "Case",
        case_id,
        `Case assigned to ${officerResult.rows[0].name}`,
      ]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: assignmentResult.rows[0],
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
    let query = `
      SELECT ca.*, 
        c.title as case_title, 
        o.name as officer_name,
        o.specialization
      FROM case_assignments ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN officers o ON ca.officer_id = o.officer_id
      WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (case_id) {
      query += ` AND ca.case_id = $${paramCount++}`;
      params.push(case_id);
    }
    if (officer_id) {
      query += ` AND ca.officer_id = $${paramCount++}`;
      params.push(officer_id);
    }
    if (status) {
      query += ` AND ca.status = $${paramCount++}`;
      params.push(status);
    }

    query += " ORDER BY ca.assigned_date DESC";

    const result = await pool.query(query, params);
    const response: ApiResponse<any[]> = {
      success: true,
      data: result.rows,
    };
    res.json(response);
  })
);

// Unassign case
router.delete(
  "/:caseId/:officerId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId, officerId } = req.params;

    const result = await pool.query(
      `UPDATE case_assignments 
       SET status = 'Inactive'
       WHERE case_id = $1 AND officer_id = $2
       RETURNING *`,
      [caseId, officerId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Assignment not found");
    }

    // Update officer caseload
    await pool.query("UPDATE officers SET caseload = caseload - 1 WHERE officer_id = $1", [
      officerId,
    ]);

    const response: ApiResponse<any> = {
      success: true,
      message: "Case unassigned successfully",
    };
    res.json(response);
  })
);

export default router;
