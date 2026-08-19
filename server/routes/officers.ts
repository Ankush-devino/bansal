import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { Officer, ApiResponse } from "@shared/types";

const router = Router();

// Get all officers
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { specialization, active } = req.query;
    let sql = "SELECT * FROM officers WHERE 1=1";
    const params: any[] = [];

    if (specialization) { sql += " AND specialization = ?"; params.push(specialization); }
    if (active !== undefined) { sql += " AND active = ?"; params.push(active === "true" ? 1 : 0); }
    sql += " ORDER BY name";

    const rows = await query<Officer>(sql, params);
    const response: ApiResponse<Officer[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get single officer
router.get(
  "/:officerId",
  asyncHandler(async (req: Request, res: Response) => {
    const { officerId } = req.params;
    const rows = await query<Officer>(
      "SELECT * FROM officers WHERE officer_id = ?",
      [officerId]
    );
    if (rows.length === 0) throw new ApiError(404, `Officer ${officerId} not found`);

    const response: ApiResponse<Officer> = { success: true, data: rows[0] };
    res.json(response);
  })
);

// Create new officer
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, specialization, email, phone, location, experience_years } = req.body;

    if (!name || !email) throw new ApiError(400, "Name and email are required");

    // Generate officer ID
    const countRows = await query<{ count: number }>("SELECT COUNT(*) as count FROM officers");
    const officerNumber = Number(countRows[0].count) + 1;
    const officer_id = `OFF-${String(officerNumber).padStart(4, "0")}`;

    await insert(
      `INSERT INTO officers (officer_id, name, specialization, email, phone, location, experience_years, success_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [officer_id, name, specialization || null, email, phone || null, location || null, experience_years || 0]
    );

    const rows = await query<Officer>(
      "SELECT * FROM officers WHERE officer_id = ?",
      [officer_id]
    );
    const response: ApiResponse<Officer> = {
      success: true,
      data: rows[0],
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

    if (name !== undefined)             { updates.push("name = ?");             values.push(name); }
    if (specialization !== undefined)   { updates.push("specialization = ?");   values.push(specialization); }
    if (email !== undefined)            { updates.push("email = ?");            values.push(email); }
    if (phone !== undefined)            { updates.push("phone = ?");            values.push(phone); }
    if (location !== undefined)         { updates.push("location = ?");         values.push(location); }
    if (experience_years !== undefined) { updates.push("experience_years = ?"); values.push(experience_years); }
    if (caseload !== undefined)         { updates.push("caseload = ?");         values.push(caseload); }
    if (success_rate !== undefined)     { updates.push("success_rate = ?");     values.push(success_rate); }
    if (active !== undefined)           { updates.push("active = ?");           values.push(active ? 1 : 0); }

    if (updates.length === 0) throw new ApiError(400, "No fields to update");

    values.push(officerId);
    await query(`UPDATE officers SET ${updates.join(", ")} WHERE officer_id = ?`, values);

    const rows = await query<Officer>(
      "SELECT * FROM officers WHERE officer_id = ?",
      [officerId]
    );
    if (rows.length === 0) throw new ApiError(404, `Officer ${officerId} not found`);

    const response: ApiResponse<Officer> = {
      success: true,
      data: rows[0],
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

    const rows = await query(
      `SELECT o.*,
        (SELECT COUNT(*) FROM case_assignments WHERE officer_id = ? AND status = 'Active') as active_cases
       FROM officers o WHERE o.officer_id = ?`,
      [officerId, officerId]
    );

    if (rows.length === 0) throw new ApiError(404, `Officer ${officerId} not found`);

    const response: ApiResponse<any> = { success: true, data: rows[0] };
    res.json(response);
  })
);

export default router;
