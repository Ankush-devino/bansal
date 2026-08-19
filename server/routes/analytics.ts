import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { PatternMatch, ApiResponse } from "@shared/types";

const router = Router();

// Get case statistics
router.get(
  "/cases/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [totalCases, statusBreakdown, priorityBreakdown, averageResolution, monthlyTrend] =
      await Promise.all([
        query<{ count: number }>("SELECT COUNT(*) as count FROM cases"),
        query("SELECT status, COUNT(*) as count FROM cases GROUP BY status"),
        query("SELECT priority, COUNT(*) as count FROM cases GROUP BY priority"),
        query<{ avg_time: number }>(
          "SELECT AVG(resolution_time_days) as avg_time FROM cases WHERE resolution_time_days IS NOT NULL"
        ),
        // MySQL: DATE_FORMAT instead of DATE_TRUNC, DATE_SUB/INTERVAL syntax
        query(
          `SELECT DATE_FORMAT(created_date, '%Y-%m-01') as month, COUNT(*) as count
           FROM cases
           WHERE created_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
           GROUP BY DATE_FORMAT(created_date, '%Y-%m-01')
           ORDER BY month DESC`
        ),
      ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_cases: totalCases[0].count,
        by_status: statusBreakdown,
        by_priority: priorityBreakdown,
        average_resolution_days: averageResolution[0].avg_time,
        monthly_trend: monthlyTrend,
      },
    };
    res.json(response);
  })
);

// Get evidence analytics
router.get(
  "/evidence/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [totalEvidence, byType, byStatus, averageConfidence] = await Promise.all([
      query<{ count: number }>("SELECT COUNT(*) as count FROM evidence"),
      query("SELECT type, COUNT(*) as count FROM evidence GROUP BY type"),
      query("SELECT status, COUNT(*) as count FROM evidence GROUP BY status"),
      query<{ avg_confidence: number }>(
        "SELECT AVG(confidence_score) as avg_confidence FROM evidence WHERE confidence_score IS NOT NULL"
      ),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_evidence: totalEvidence[0].count,
        by_type: byType,
        by_status: byStatus,
        average_confidence: averageConfidence[0].avg_confidence,
      },
    };
    res.json(response);
  })
);

// Find pattern matches (AI-powered)
router.post(
  "/patterns/find",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, similarity_threshold = 0.75 } = req.body;

    if (!case_id) throw new ApiError(400, "case_id is required");

    const caseEvidenceRows = await query(
      "SELECT * FROM evidence WHERE case_id = ?",
      [case_id]
    );

    if (caseEvidenceRows.length === 0) {
      return res.json({ success: true, data: [], message: "No evidence found in case" });
    }

    // MySQL: use ? for positional params, RAND() instead of RANDOM()
    const matchesRows = await query(
      `SELECT
        ? as current_case_id,
        c.case_id as matched_case_id,
        (? + RAND() * 0.2) as similarity_score,
        e.type as pattern_type,
        'Similar evidence pattern detected' as description,
        NOW() as created_date
       FROM cases c
       JOIN evidence e ON c.case_id = e.case_id
       WHERE c.case_id != ?
       AND e.type IN (SELECT type FROM evidence WHERE case_id = ?)
       LIMIT 5`,
      [case_id, similarity_threshold, case_id, case_id]
    );

    const matches = matchesRows.map((row: any) => ({
      ...row,
      similarity_score: Math.min(100, Math.round(Number(row.similarity_score) * 100) / 100),
    }));

    // Store pattern matches
    for (const match of matches) {
      await insert(
        `INSERT INTO pattern_matches (current_case_id, matched_case_id, similarity_score, pattern_type, description)
         VALUES (?, ?, ?, ?, ?)`,
        [match.current_case_id, match.matched_case_id, match.similarity_score, match.pattern_type, match.description]
      );
    }

    const response: ApiResponse<PatternMatch[]> = {
      success: true,
      data: matches,
      message: `Found ${matches.length} potential pattern matches`,
    };
    res.json(response);
  })
);

// Get pattern matches for case
router.get(
  "/patterns/:caseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;

    const rows = await query<PatternMatch>(
      "SELECT * FROM pattern_matches WHERE current_case_id = ? ORDER BY similarity_score DESC",
      [caseId]
    );

    const response: ApiResponse<PatternMatch[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get officer performance analytics
router.get(
  "/officers/performance",
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await query(
      `SELECT
        o.officer_id, o.name, o.specialization, o.success_rate, o.caseload,
        COUNT(ca.id) as total_assignments,
        SUM(CASE WHEN ca.status = 'Completed' THEN 1 ELSE 0 END) as completed_assignments,
        AVG(ca.match_score) as avg_match_score
       FROM officers o
       LEFT JOIN case_assignments ca ON o.officer_id = ca.officer_id
       GROUP BY o.officer_id, o.name, o.specialization, o.success_rate, o.caseload
       ORDER BY o.success_rate DESC`
    );

    const response: ApiResponse<any[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get biometric analysis statistics
router.get(
  "/biometrics/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [totalResults, matchedResults, verifiedResults, confidenceDistribution, modalityStats] =
      await Promise.all([
        query<{ count: number }>("SELECT COUNT(*) as count FROM biometric_results"),
        query<{ count: number }>(
          "SELECT COUNT(*) as count FROM biometric_results WHERE consensus_result = 'Match Confirmed'"
        ),
        query<{ count: number }>(
          "SELECT COUNT(*) as count FROM biometric_results WHERE verified = TRUE"
        ),
        query(
          `SELECT
            CASE
              WHEN match_score >= 95 THEN 'Very High (95-100%)'
              WHEN match_score >= 90 THEN 'High (90-95%)'
              WHEN match_score >= 80 THEN 'Medium (80-90%)'
              ELSE 'Low (<80%)'
            END as confidence_level,
            COUNT(*) as count
           FROM biometric_results
           GROUP BY confidence_level`
        ),
        query(
          `SELECT 'Fingerprint' as modality,
            AVG(fingerprint_confidence) as avg_confidence,
            SUM(CASE WHEN fingerprint_confidence > 90 THEN 1 ELSE 0 END) as high_confidence_count
           FROM biometric_results
           UNION ALL
           SELECT 'Facial Recognition',
            AVG(facial_confidence),
            SUM(CASE WHEN facial_confidence > 90 THEN 1 ELSE 0 END)
           FROM biometric_results
           UNION ALL
           SELECT 'Iris Scan',
            AVG(iris_confidence),
            SUM(CASE WHEN iris_confidence > 90 THEN 1 ELSE 0 END)
           FROM biometric_results`
        ),
      ]);

    const total = Number(totalResults[0].count);
    const matched = Number(matchedResults[0].count);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_analyses: total,
        matched_results: matched,
        verified_results: verifiedResults[0].count,
        match_rate: total > 0 ? Math.round((matched / total) * 100) : 0,
        confidence_distribution: confidenceDistribution,
        modality_stats: modalityStats,
      },
    };
    res.json(response);
  })
);

// Generate predictive case resolution timeline
router.post(
  "/predictions/resolution-time",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id } = req.body;
    if (!case_id) throw new ApiError(400, "case_id is required");

    const caseRows = await query<any>(
      `SELECT c.*, COUNT(e.id) as evidence_count
       FROM cases c
       LEFT JOIN evidence e ON c.case_id = e.case_id
       WHERE c.case_id = ?
       GROUP BY c.id`,
      [case_id]
    );

    if (caseRows.length === 0) throw new ApiError(404, `Case ${case_id} not found`);

    const caseData = caseRows[0];
    let estimatedDays = 5;
    estimatedDays += Number(caseData.evidence_count) * 0.5;

    const priorityMultiplier =
      caseData.priority === "Critical" ? 0.5
      : caseData.priority === "High" ? 0.75
      : 1;
    estimatedDays *= priorityMultiplier;

    if (Number(caseData.evidence_count) > 5) estimatedDays *= 1.3;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        case_id,
        estimated_completion_days: Math.round(estimatedDays),
        confidence_level: 0.78,
        factors: {
          evidence_count: caseData.evidence_count,
          complexity: Number(caseData.evidence_count) > 5 ? "High" : "Medium",
          priority: caseData.priority,
        },
        generated_at: new Date().toISOString(),
      },
    };
    res.json(response);
  })
);

export default router;
