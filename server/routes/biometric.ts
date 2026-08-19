import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { BiometricResult, ApiResponse } from "@shared/types";

const router = Router();

// Get all biometric results
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, verified } = req.query;
    let sql = "SELECT * FROM biometric_results WHERE 1=1";
    const params: any[] = [];

    if (case_id)              { sql += " AND case_id = ?";  params.push(case_id); }
    if (verified !== undefined){ sql += " AND verified = ?"; params.push(verified === "true" ? 1 : 0); }
    sql += " ORDER BY created_date DESC";

    const rows = await query<BiometricResult>(sql, params);
    const response: ApiResponse<BiometricResult[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get single biometric result
router.get(
  "/:resultId",
  asyncHandler(async (req: Request, res: Response) => {
    const { resultId } = req.params;
    const rows = await query<BiometricResult>(
      "SELECT * FROM biometric_results WHERE result_id = ?",
      [resultId]
    );
    if (rows.length === 0) throw new ApiError(404, `Biometric result ${resultId} not found`);

    const response: ApiResponse<BiometricResult> = { success: true, data: rows[0] };
    res.json(response);
  })
);

// Create biometric analysis result
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      case_id, evidence_id, suspect_id, suspect_name,
      fingerprint_confidence, facial_confidence, iris_confidence, voice_confidence,
    } = req.body;

    if (!case_id) throw new ApiError(400, "case_id is required");

    const caseRows = await query("SELECT case_id FROM cases WHERE case_id = ?", [case_id]);
    if (caseRows.length === 0) throw new ApiError(404, `Case ${case_id} not found`);

    const confidences = [fingerprint_confidence, facial_confidence, iris_confidence, voice_confidence]
      .filter((c) => c !== undefined && c !== null);

    const matchScore = confidences.length > 0
      ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
      : 0;

    let consensusResult = "No Match";
    if (matchScore >= 95)     consensusResult = "Match Confirmed";
    else if (matchScore >= 85) consensusResult = "High Confidence Match";
    else if (matchScore >= 70) consensusResult = "Partial Match";

    // Generate result ID
    const countRows = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM biometric_results WHERE case_id = ?",
      [case_id]
    );
    const resultNumber = Number(countRows[0].count) + 1;
    const result_id = `${case_id}-BIO-${String(resultNumber).padStart(3, "0")}`;

    await insert(
      `INSERT INTO biometric_results
       (result_id, case_id, evidence_id, suspect_id, suspect_name, match_score, consensus_result,
        fingerprint_confidence, facial_confidence, iris_confidence, voice_confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result_id, case_id, evidence_id || null, suspect_id || null, suspect_name || null,
        matchScore, consensusResult,
        fingerprint_confidence || null, facial_confidence || null,
        iris_confidence || null, voice_confidence || null,
      ]
    );

    await insert(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        `AUDIT-${Date.now()}`, "Biometric Analysis", "AI System",
        "BiometricResult", result_id, `Biometric analysis completed: ${consensusResult}`,
      ]
    );

    const rows = await query<BiometricResult>(
      "SELECT * FROM biometric_results WHERE result_id = ?",
      [result_id]
    );
    const response: ApiResponse<BiometricResult> = {
      success: true,
      data: rows[0],
      message: "Biometric analysis created successfully",
    };
    res.status(201).json(response);
  })
);

// Verify biometric result
router.put(
  "/:resultId/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const { resultId } = req.params;
    const { verified_by } = req.body;

    await query(
      "UPDATE biometric_results SET verified = TRUE WHERE result_id = ?",
      [resultId]
    );

    const rows = await query<BiometricResult>(
      "SELECT * FROM biometric_results WHERE result_id = ?",
      [resultId]
    );
    if (rows.length === 0) throw new ApiError(404, `Biometric result ${resultId} not found`);

    await insert(
      `INSERT INTO audit_trail (entry_id, action, actor, target_type, target_id, details, verified)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        `AUDIT-${Date.now()}`, "Biometric Verified", verified_by || "Expert",
        "BiometricResult", resultId, "Biometric result verified by expert",
      ]
    );

    const response: ApiResponse<BiometricResult> = {
      success: true,
      data: rows[0],
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

    // MySQL IN clause with ? placeholders
    const placeholders = result_ids.map(() => "?").join(",");
    const results = await query<BiometricResult>(
      `SELECT * FROM biometric_results WHERE result_id IN (${placeholders})`,
      result_ids
    );

    if (results.length === 0) throw new ApiError(404, "No results found");

    const avgFingerprint = results.reduce((s, r) => s + (r.fingerprint_confidence || 0), 0) / results.length;
    const avgFacial      = results.reduce((s, r) => s + (r.facial_confidence    || 0), 0) / results.length;
    const avgIris        = results.reduce((s, r) => s + (r.iris_confidence       || 0), 0) / results.length;
    const avgVoice       = results.reduce((s, r) => s + (r.voice_confidence      || 0), 0) / results.length;
    const overallScore   = (avgFingerprint + avgFacial + avgIris + avgVoice) / 4;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        consensus_score: Math.round(overallScore * 100) / 100,
        modality_scores: {
          fingerprint: Math.round(avgFingerprint * 100) / 100,
          facial:      Math.round(avgFacial      * 100) / 100,
          iris:        Math.round(avgIris         * 100) / 100,
          voice:       Math.round(avgVoice        * 100) / 100,
        },
        agreement_level:
          overallScore >= 95 ? "Very High"
          : overallScore >= 85 ? "High"
          : overallScore >= 70 ? "Moderate"
          : "Low",
        results_compared: results.length,
      },
    };
    res.json(response);
  })
);

export default router;
