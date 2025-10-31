import { Router, Request, Response } from "express";
import pool from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { Officer, ApiResponse } from "@shared/types";

const router = Router();

// Get all officers
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { specialization, active } = req.query;
    let query = "SELECT * FROM officers WHERE 1=1";
    const params: any[] = [];
    let paramCount = 1;

    if (specialization) {
      query += ` AND specialization = $${paramCount++}`;
      params.push(specialization);
    }
    if (active !== undefined) {
      query += ` AND active = $${paramCount++}`;
      params.push(active === "true");
    }

    query += " ORDER BY name";

    const result = await pool.query(query, params);
    const response: ApiResponse<Officer[]> = {
      success: true,
      data: result.rows as Officer[],
    };
    res.json(response);
  })
);

// Get single officer
router.get(
  "/:officerId",
  asyncHandler(async (req: Request, res: Response) => {
    const { officerId } = req.params;

    const result = await pool.query("SELECT * FROM officers WHERE officer_id = $1", [
      officerId,
    ]);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Officer ${officerId} not found`);
    }

    const response: ApiResponse<Officer> = {
      success: true,
      data: result.rows[0] as Officer,
    };
    res.json(response);
  })
);

// Create new officer
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, specialization, email, phone, location, experience_years } = req.body;

    if (!name || !email) {
      throw new ApiError(400, "Name and email are required");
    }

    // Generate officer ID
    const officerCountResult = await pool.query("SELECT COUNT(*) as count FROM officers");
    const officerNumber = (officerCountResult.rows[0].count as number) + 1;
    const officer_id = `OFF-${String(officerNumber).padStart(4, "0")}`;

    const result = await pool.query(
      `INSERT INTO officers (officer_id, name, specialization, email, phone, location, experience_years, success_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
       RETURNING *`,
      [officer_id, name, specialization || null, email, phone || null, location || null, experience_years || 0]
    );

    const response: ApiResponse<Officer> = {
      success: true,
      data: result.rows[0] as Officer,
      message: "Officer created successfully",
    };
    res.status(201).json(response);
  })
);

// Update officer
router.put(
  "/:officerId",
  asyncHandler(async (req: Request, res: Response) => {
    const { officerId } = req.params;
    const { name, specialization, email, phone, location, experience_years, caseload, success_rate, active } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (specialization !== undefined) {
      updates.push(`specialization = $${paramCount++}`);
      values.push(specialization);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (experience_years !== undefined) {
      updates.push(`experience_years = $${paramCount++}`);
      values.push(experience_years);
    }
    if (caseload !== undefined) {
      updates.push(`caseload = $${paramCount++}`);
      values.push(caseload);
    }
    if (success_rate !== undefined) {
      updates.push(`success_rate = $${paramCount++}`);
      values.push(success_rate);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }

    if (updates.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    values.push(officerId);

    const result = await pool.query(
      `UPDATE officers SET ${updates.join(", ")} WHERE officer_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Officer ${officerId} not found`);
    }

    const response: ApiResponse<Officer> = {
      success: true,
      data: result.rows[0] as Officer,
      message: "Officer updated successfully",
    };
    res.json(response);
  })
);

// Get officer workload
router.get(
  "/:officerId/workload",
  asyncHandler(async (req: Request, res: Response) => {
    const { officerId } = req.params;

    const result = await pool.query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM case_assignments WHERE officer_id = $1 AND status = 'Active') as active_cases
       FROM officers o WHERE o.officer_id = $1`,
      [officerId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, `Officer ${officerId} not found`);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: result.rows[0],
    };
    res.json(response);
  })
);

export default router;
