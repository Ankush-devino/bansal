import { Router, Request, Response } from "express";
import pool from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { PatternMatch, ApiResponse } from "@shared/types";

const router = Router();

/**
 * Analytics and Pattern Matching
 * AI-powered cross-case pattern analysis for identifying serial offenders
 */

// Get case statistics
router.get(
  "/cases/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [
      totalCases,
      statusBreakdown,
      priorityBreakdown,
      averageResolution,
      monthlyTrend,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM cases"),
      pool.query(
        `SELECT status, COUNT(*) as count FROM cases GROUP BY status`
      ),
      pool.query(
        `SELECT priority, COUNT(*) as count FROM cases GROUP BY priority`
      ),
      pool.query(
        `SELECT AVG(resolution_time_days) as avg_time FROM cases WHERE resolution_time_days IS NOT NULL`
      ),
      pool.query(
        `SELECT DATE_TRUNC('month', created_date) as month, COUNT(*) as count 
         FROM cases 
         WHERE created_date >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', created_date)
         ORDER BY month DESC`
      ),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_cases: totalCases.rows[0].count,
        by_status: statusBreakdown.rows,
        by_priority: priorityBreakdown.rows,
        average_resolution_days: averageResolution.rows[0].avg_time,
        monthly_trend: monthlyTrend.rows,
      },
    };
    res.json(response);
  })
);

// Get evidence analytics
router.get(
  "/evidence/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [
      totalEvidence,
      byType,
      byStatus,
      averageConfidence,
      analysisTime,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM evidence"),
      pool.query(
        `SELECT type, COUNT(*) as count FROM evidence GROUP BY type`
      ),
      pool.query(
        `SELECT status, COUNT(*) as count FROM evidence GROUP BY status`
      ),
      pool.query(
        `SELECT AVG(confidence_score) as avg_confidence FROM evidence WHERE confidence_score IS NOT NULL`
      ),
      pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (analyzed_date - uploaded_date))/3600) as avg_hours
         FROM (SELECT uploaded_date, MAX(updated_date) as analyzed_date FROM evidence GROUP BY uploaded_date) subq`
      ),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_evidence: totalEvidence.rows[0].count,
        by_type: byType.rows,
        by_status: byStatus.rows,
        average_confidence: averageConfidence.rows[0].avg_confidence,
      },
    };
    res.json(response);
  })
);

// Find pattern matches (AI-powered)
router.post(
  "/patterns/find",
  asyncHandler(async (req: Request, res: Response) => {
    const { case_id, evidence_type, similarity_threshold = 0.75 } = req.body;

    if (!case_id) {
      throw new ApiError(400, "case_id is required");
    }

    // Get current case evidence
    const caseEvidenceResult = await pool.query(
      "SELECT * FROM evidence WHERE case_id = $1",
      [case_id]
    );

    if (caseEvidenceResult.rows.length === 0) {
      const response: ApiResponse<PatternMatch[]> = {
        success: true,
        data: [],
        message: "No evidence found in case",
      };
      return res.json(response);
    }

    // Simulate AI pattern matching by finding similar cases
    // In production, this would use ML models for actual pattern analysis
    const matchesResult = await pool.query(
      `SELECT 
        $1 as current_case_id,
        c.case_id as matched_case_id,
        ${similarity_threshold} + RANDOM() * 0.2 as similarity_score,
        e.type as pattern_type,
        'Similar evidence pattern detected' as description,
        NOW() as created_date
       FROM cases c
       JOIN evidence e ON c.case_id = e.case_id
       WHERE c.case_id != $1 
       AND e.type IN (SELECT type FROM evidence WHERE case_id = $1)
       LIMIT 5`,
      [case_id]
    );

    const matches = matchesResult.rows.map((row) => ({
      ...row,
      similarity_score: Math.min(100, Math.round(row.similarity_score * 100) / 100),
    }));

    // Store pattern matches
    for (const match of matches) {
      await pool.query(
        `INSERT INTO pattern_matches (current_case_id, matched_case_id, similarity_score, pattern_type, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          match.current_case_id,
          match.matched_case_id,
          match.similarity_score,
          match.pattern_type,
          match.description,
        ]
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

    const result = await pool.query(
      `SELECT * FROM pattern_matches 
       WHERE current_case_id = $1 
       ORDER BY similarity_score DESC`,
      [caseId]
    );

    const response: ApiResponse<PatternMatch[]> = {
      success: true,
      data: result.rows as PatternMatch[],
    };
    res.json(response);
  })
);

// Get officer performance analytics
router.get(
  "/officers/performance",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT 
        o.officer_id,
        o.name,
        o.specialization,
        o.success_rate,
        o.caseload,
        COUNT(ca.id) as total_assignments,
        SUM(CASE WHEN ca.status = 'Completed' THEN 1 ELSE 0 END) as completed_assignments,
        AVG(ca.match_score) as avg_match_score
       FROM officers o
       LEFT JOIN case_assignments ca ON o.officer_id = ca.officer_id
       GROUP BY o.officer_id, o.name, o.specialization, o.success_rate, o.caseload
       ORDER BY o.success_rate DESC`
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: result.rows,
    };
    res.json(response);
  })
);

// Get biometric analysis statistics
router.get(
  "/biometrics/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [
      totalResults,
      matchedResults,
      verifiedResults,
      confidenceDistribution,
      modalityStats,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM biometric_results"),
      pool.query(
        "SELECT COUNT(*) as count FROM biometric_results WHERE consensus_result = 'Match Confirmed'"
      ),
      pool.query(
        "SELECT COUNT(*) as count FROM biometric_results WHERE verified = true"
      ),
      pool.query(
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
      pool.query(
        `SELECT 
          'Fingerprint' as modality,
          AVG(fingerprint_confidence) as avg_confidence,
          SUM(CASE WHEN fingerprint_confidence > 90 THEN 1 ELSE 0 END) as high_confidence_count
         FROM biometric_results
         UNION ALL
         SELECT 
          'Facial Recognition' as modality,
          AVG(facial_confidence) as avg_confidence,
          SUM(CASE WHEN facial_confidence > 90 THEN 1 ELSE 0 END) as high_confidence_count
         FROM biometric_results
         UNION ALL
         SELECT 
          'Iris Scan' as modality,
          AVG(iris_confidence) as avg_confidence,
          SUM(CASE WHEN iris_confidence > 90 THEN 1 ELSE 0 END) as high_confidence_count
         FROM biometric_results`
      ),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_analyses: totalResults.rows[0].count,
        matched_results: matchedResults.rows[0].count,
        verified_results: verifiedResults.rows[0].count,
        match_rate: totalResults.rows[0].count > 0 
          ? Math.round((matchedResults.rows[0].count / totalResults.rows[0].count) * 100)
          : 0,
        confidence_distribution: confidenceDistribution.rows,
        modality_stats: modalityStats.rows,
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

    if (!case_id) {
      throw new ApiError(400, "case_id is required");
    }

    // Get case details
    const caseResult = await pool.query(
      `SELECT c.*, COUNT(e.id) as evidence_count
       FROM cases c
       LEFT JOIN evidence e ON c.case_id = e.case_id
       WHERE c.case_id = $1
       GROUP BY c.id`,
      [case_id]
    );

    if (caseResult.rows.length === 0) {
      throw new ApiError(404, `Case ${case_id} not found`);
    }

    const caseData = caseResult.rows[0];

    // Simple ML-based prediction
    // In production, would use trained ML model
    let estimatedDays = 5; // Base estimate

    // Factor in complexity (evidence count)
    estimatedDays += caseData.evidence_count * 0.5;

    // Factor in priority
    const priorityMultiplier =
      caseData.priority === "Critical" ? 0.5 :
      caseData.priority === "High" ? 0.75 :
      1;
    estimatedDays *= priorityMultiplier;

    // Factor in evidence types
    const hasComplexEvidence = caseData.evidence_count > 5;
    if (hasComplexEvidence) {
      estimatedDays *= 1.3;
    }

    const prediction = {
      case_id,
      estimated_completion_days: Math.round(estimatedDays),
      confidence_level: 0.78,
      factors: {
        evidence_count: caseData.evidence_count,
        complexity: hasComplexEvidence ? "High" : "Medium",
        priority: caseData.priority,
      },
      generated_at: new Date().toISOString(),
    };

    const response: ApiResponse<any> = {
      success: true,
      data: prediction,
    };
    res.json(response);
  })
);

export default router;
