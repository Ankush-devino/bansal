import { Router, Request, Response } from "express";
import pool from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { BiometricResult, ApiResponse } from "@shared/types";

const router = Router();

/**
 * Multi-Modal Biometric Fusion
 * Combines fingerprint, facial recognition, iris scan, and voice analysis
 */

// Get all biometric results
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, verified } = req.query;
    let query = "SELECT * FROM biometric_results WHERE 1=1";
    const params: any[] = [];
    let paramCount = 1;

    if (case_id) {
      query += ` AND case_id = $${paramCount++}`;
      params.push(case_id);
    }
    if (verified !== undefined) {
      query += ` AND verified = $${paramCount++}`;
      params.push(verified === "true");
    }

    query += " ORDER BY created_date DESC";

    const result = await pool.query(query, params);
    const response: ApiResponse<BiometricResult[]> = {
      success: true,
      data: result.rows as BiometricResult[],
    };
    res.json(response);
  })
);

// Get single biometric result
router.get(
  "/:resultId",
  asyncHandler(async (req: Request, res: Response) => {
    const { resultId } = req.params;

    const result = await pool.query(
      "SELECT * FROM biometric_results WHERE result_id = $1",
      [resultId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Biometric result ${resultId} not found`);
    }

    const response: ApiResponse<BiometricResult> = {
      success: true,
      data: result.rows[0] as BiometricResult,
    };
    res.json(response);
  })
);

// Create biometric analysis result
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      case_id,
      evidence_id,
      suspect_id,
      suspect_name,
      fingerprint_confidence,
      facial_confidence,
      iris_confidence,
      voice_confidence,
    } = req.body;

    if (!case_id) {
      throw new ApiError(400, "case_id is required");
    }

    // Verify case exists
    const caseResult = await pool.query("SELECT * FROM cases WHERE case_id = $1", [case_id]);
    if (caseResult.rows.length === 0) {
      throw new ApiError(404, `Case ${case_id} not found`);
    }

    // Calculate consensus match score
    // Simple average, in production would use weighted ML algorithm
    const confidences = [
      fingerprint_confidence,
      facial_confidence,
      iris_confidence,
      voice_confidence,
    ].filter((c) => c !== undefined && c !== null);

    const matchScore =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    // Determine consensus result
    let consensusResult = "No Match";
    if (matchScore >= 95) {
      consensusResult = "Match Confirmed";
    } else if (matchScore >= 85) {
      consensusResult = "High Confidence Match";
    } else if (matchScore >= 70) {
      consensusResult = "Partial Match";
    }

    // Generate result ID
    const resultCountResult = await pool.query(
      "SELECT COUNT(*) as count FROM biometric_results WHERE case_id = $1",
      [case_id]
    );
    const resultNumber = (resultCountResult.rows[0].count as number) + 1;
    const result_id = `${case_id}-BIO-${String(resultNumber).padStart(3, "0")}`;

    const resultData = await pool.query(
      `INSERT INTO biometric_results 
       (result_id, case_id, evidence_id, suspect_id, suspect_name, match_score, consensus_result,
        fingerprint_confidence, facial_confidence, iris_confidence, voice_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        result_id,
        case_id,
        evidence_id || null,
        suspect_id || null,
        suspect_name || null,
        matchScore,
        consensusResult,
        fingerprint_confidence || null,
        facial_confidence || null,
        iris_confidence || null,
        voice_confidence || null,
      ]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        `AUDIT-${Date.now()}`,
        "Biometric Analysis",
        "AI System",
        "BiometricResult",
        result_id,
        `Biometric analysis completed: ${consensusResult}`,
      ]
    );

    const response: ApiResponse<BiometricResult> = {
      success: true,
      data: resultData.rows[0] as BiometricResult,
      message: "Biometric analysis created successfully",
    };
    res.status(201).json(response);
  })
);

// Verify biometric result (expert verification)
router.put(
  "/:resultId/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const { resultId } = req.params;
    const { verified_by } = req.body;

    const result = await pool.query(
      `UPDATE biometric_results 
       SET verified = true
       WHERE result_id = $1
       RETURNING *`,
      [resultId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Biometric result ${resultId} not found`);
    }

    // Log verification
    await pool.query(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        `AUDIT-${Date.now()}`,
        "Biometric Verified",
        verified_by || "Expert",
        "BiometricResult",
        resultId,
        `Biometric result verified by expert`,
      ]
    );

    const response: ApiResponse<BiometricResult> = {
      success: true,
      data: result.rows[0] as BiometricResult,
      message: "Biometric result verified",
    };
    res.json(response);
  })
);

// Compare multiple biometric modalities for consensus
router.post(
  "/consensus/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const { result_ids } = req.body;

    if (!result_ids || !Array.isArray(result_ids)) {
      throw new ApiError(400, "result_ids array is required");
    }

    // Get all results
    const placeholders = result_ids.map((_, i) => `$${i + 1}`).join(",");
    const results = await pool.query(
      `SELECT * FROM biometric_results WHERE result_id IN (${placeholders})`,
      result_ids
    );

    if (results.rows.length === 0) {
      throw new ApiError(404, "No results found");
    }

    // Calculate consensus
    const avgFingerprint =
      results.rows.reduce((sum, r) => sum + (r.fingerprint_confidence || 0), 0) /
      results.rows.length;
    const avgFacial =
      results.rows.reduce((sum, r) => sum + (r.facial_confidence || 0), 0) /
      results.rows.length;
    const avgIris =
      results.rows.reduce((sum, r) => sum + (r.iris_confidence || 0), 0) /
      results.rows.length;
    const avgVoice =
      results.rows.reduce((sum, r) => sum + (r.voice_confidence || 0), 0) /
      results.rows.length;

    const overallScore =
      (avgFingerprint + avgFacial + avgIris + avgVoice) / 4;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        consensus_score: Math.round(overallScore * 100) / 100,
        modality_scores: {
          fingerprint: Math.round(avgFingerprint * 100) / 100,
          facial: Math.round(avgFacial * 100) / 100,
          iris: Math.round(avgIris * 100) / 100,
          voice: Math.round(avgVoice * 100) / 100,
        },
        agreement_level:
          overallScore >= 95
            ? "Very High"
            : overallScore >= 85
            ? "High"
            : overallScore >= 70
            ? "Moderate"
            : "Low",
        results_compared: results.rows.length,
      },
    };
    res.json(response);
  })
);

export default router;
