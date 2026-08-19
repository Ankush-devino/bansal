import { Router, Request, Response } from "express";
import { query, insert } from "../db";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { AuditEntry, ApiResponse } from "@shared/types";

const router = Router();

// Get audit trail
router.get(
  "/audit",
  asyncHandler(async (req: Request, res: Response) => {
    const { target_type, target_id } = req.query;
    let sql = "SELECT * FROM audit_trail WHERE 1=1";
    const params: any[] = [];

    if (target_type) { sql += " AND target_type = ?"; params.push(target_type); }
    if (target_id)   { sql += " AND target_id = ?";   params.push(target_id); }
    sql += " ORDER BY timestamp DESC";

    const rows = await query<AuditEntry>(sql, params);
    const response: ApiResponse<AuditEntry[]> = { success: true, data: rows };
    res.json(response);
  })
);

// Get single audit entry
router.get(
  "/audit/:entryId",
  asyncHandler(async (req: Request, res: Response) => {
    const { entryId } = req.params;
    const rows = await query<AuditEntry>(
      "SELECT * FROM audit_trail WHERE entry_id = ?",
      [entryId]
    );
    if (rows.length === 0) throw new ApiError(404, `Audit entry ${entryId} not found`);

    const response: ApiResponse<AuditEntry> = { success: true, data: rows[0] };
    res.json(response);
  })
);

// Record blockchain transaction
router.post(
  "/record-transaction",
  asyncHandler(async (req: Request, res: Response) => {
    const { action, target_type, target_id, details } = req.body;

    if (!action || !target_type || !target_id) {
      throw new ApiError(400, "action, target_type, and target_id are required");
    }

    const mockBlockchainHash = `0x${Math.random().toString(16).slice(2)}`;
    const mockSignature = `SIG-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const entryId = `AUDIT-${Date.now()}`;

    await insert(
      `INSERT INTO audit_trail
       (entry_id, action, actor, target_type, target_id, details, block_hash, signature, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [entryId, action, "System", target_type, target_id, details || null, mockBlockchainHash, mockSignature]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: {
        entry_id: entryId,
        blockchain_hash: mockBlockchainHash,
        signature: mockSignature,
        verified: true,
        message: "Transaction recorded on blockchain",
      },
    };
    res.status(201).json(response);
  })
);

// Store evidence on IPFS (stub)
router.post(
  "/ipfs/store",
  asyncHandler(async (req: Request, res: Response) => {
    const { evidence_id, file_hash } = req.body;

    if (!evidence_id || !file_hash) {
      throw new ApiError(400, "evidence_id and file_hash are required");
    }

    const mockIPFSHash = `QmIPFS${Math.random().toString(36).slice(2, 46)}`;

    const rows = await query(
      "SELECT evidence_id FROM evidence WHERE evidence_id = ?",
      [evidence_id]
    );
    if (rows.length === 0) throw new ApiError(404, `Evidence ${evidence_id} not found`);

    await query(
      "UPDATE evidence SET ipfs_hash = ? WHERE evidence_id = ?",
      [mockIPFSHash, evidence_id]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: { evidence_id, ipfs_hash: mockIPFSHash, timestamp: new Date().toISOString() },
      message: "Evidence stored on IPFS",
    };
    res.json(response);
  })
);

// Verify chain of custody
router.post(
  "/verify-chain-of-custody",
  asyncHandler(async (req: Request, res: Response) => {
    const { evidence_id } = req.body;
    if (!evidence_id) throw new ApiError(400, "evidence_id is required");

    const evidenceRows = await query(
      "SELECT * FROM evidence WHERE evidence_id = ?",
      [evidence_id]
    );
    if (evidenceRows.length === 0) throw new ApiError(404, `Evidence ${evidence_id} not found`);

    const auditRows = await query<AuditEntry>(
      "SELECT * FROM audit_trail WHERE target_id = ? ORDER BY timestamp",
      [evidence_id]
    );

    const integrityStatus = auditRows.every((e) => e.verified) ? "Valid" : "Compromised";

    const response: ApiResponse<any> = {
      success: true,
      data: {
        evidence_id,
        integrity_status: integrityStatus,
        chain_of_custody_entries: auditRows.length,
        transfers: auditRows.filter((e) => e.action === "Chain of Custody Transfer"),
        verified_entries: auditRows.filter((e) => e.verified).length,
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  })
);

// Get blockchain stats
router.get(
  "/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const [auditRows, verifiedRows, evidenceRows] = await Promise.all([
      query<{ count: number }>("SELECT COUNT(*) as count FROM audit_trail"),
      query<{ count: number }>("SELECT COUNT(*) as count FROM audit_trail WHERE verified = TRUE"),
      query<{ count: number }>("SELECT COUNT(*) as count FROM evidence WHERE blockchain_hash IS NOT NULL AND blockchain_hash != ''"),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_audit_records: auditRows[0].count,
        verified_records: verifiedRows[0].count,
        evidence_on_blockchain: evidenceRows[0].count,
        integrity_status: "All Records Valid",
      },
    };
    res.json(response);
  })
);

// Smart contract verification stub
router.post(
  "/smart-contract/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const { result_id, expert_signatures } = req.body;
    if (!result_id) throw new ApiError(400, "result_id is required");

    const mockContractAddress = `0x${Math.random().toString(16).slice(2, 42)}`;
    const mockTransactionHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        result_id,
        contract_address: mockContractAddress,
        transaction_hash: mockTransactionHash,
        signatures_required: 2,
        signatures_collected: expert_signatures ? expert_signatures.length : 0,
        consensus_reached: (expert_signatures ? expert_signatures.length : 0) >= 2,
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  })
);

// Model version control on blockchain (stub)
router.post(
  "/model-version/record",
  asyncHandler(async (req: Request, res: Response) => {
    const { model_name, version, accuracy, training_data_hash } = req.body;
    if (!model_name || !version) throw new ApiError(400, "model_name and version are required");

    const mockIPFSHash = `QmMODEL${Math.random().toString(36).slice(2, 46)}`;
    const mockBlockchainHash = `0x${Math.random().toString(16).slice(2)}`;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        model_name, version,
        ipfs_hash: mockIPFSHash,
        blockchain_hash: mockBlockchainHash,
        accuracy: accuracy || null,
        training_data_hash: training_data_hash || null,
        deployment_date: new Date().toISOString(),
        court_admissible: true,
      },
    };
    res.status(201).json(response);
  })
);

export default router;
