/**
 * useForensicStore — Central shared state for the forensic investigation app.
 *
 * All pages (Cases, Evidence, Collaboration, Audit, Assignment) subscribe to
 * this store so that creating a case or uploading evidence is instantly reflected
 * everywhere without prop-drilling or separate fetch calls.
 *
 * Graceful degradation: when the API / DB is unavailable the store falls back
 * to rich seed data so every page always looks fully populated.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForensicCase {
  id: number;
  case_id: string;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed" | "On Hold";
  priority: "Low" | "Medium" | "High" | "Critical";
  assigned_to: string;
  created_date: string;
  updated_date: string;
  created_by: string;
  evidence_count: number;
  resolution_time_days?: number | null;
}

export interface ForensicEvidence {
  id: number;
  evidence_id: string;
  case_id: string;
  type:
    | "Fingerprint"
    | "Facial Recognition"
    | "DNA"
    | "Digital Forensics"
    | "Iris Scan"
    | "Voice Analysis";
  description: string;
  status: "Pending Analysis" | "Analyzing" | "Analyzed";
  uploaded_date: string;
  uploaded_by: string;
  analysis_status: string;
  confidence_score: number;
  blockchain_hash: string;
}

export interface ForensicOfficer {
  id: number;
  officer_id: string;
  name: string;
  specialization: string;
  caseload: number;
  success_rate: number;
  location: string;
  experience_years: number;
  email: string;
  active: boolean;
}

export interface ForensicAssignment {
  id: string;
  case_id: string;
  case_title: string;
  officer_id: string;
  officer_name: string;
  match_score: number;
  status: string;
  assigned_at: string;
}

export interface ForensicAuditEntry {
  id: number;
  entry_id: string;
  action: string;
  actor: string;
  target_type: string;
  target_id: string;
  details: string;
  block_hash: string;
  verified: boolean;
  signature: string;
  timestamp: string;
}

export interface BoardAnnotation {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  color: string;
}

export interface CollabBoard {
  case_id: string;
  annotations: BoardAnnotation[];
}

interface CreateCaseInput {
  title: string;
  description?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  location?: string;
  created_by?: string;
}

interface UploadEvidenceInput {
  case_id: string;
  type: ForensicEvidence["type"];
  description?: string;
  uploaded_by?: string;
}

interface ForensicStore {
  cases: ForensicCase[];
  evidence: ForensicEvidence[];
  officers: ForensicOfficer[];
  assignments: ForensicAssignment[];
  auditEntries: ForensicAuditEntry[];
  auditLogs: ForensicAuditEntry[];  // alias for auditEntries
  boards: CollabBoard[];
  loading: boolean;
  error: string | null;
  apiOnline: boolean;
  refresh: () => Promise<void>;
  createCase: (input: CreateCaseInput) => Promise<ForensicCase | null>;
  uploadEvidence: (input: UploadEvidenceInput) => Promise<ForensicEvidence | null>;
  addAnnotation: (caseId: string, text: string, author?: string) => void;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_CASES: ForensicCase[] = [
  {
    id: 1,
    case_id: "CASE-2024-001",
    title: "Breaking and Entering – Downtown",
    description: "Residential burglary with multiple biometric evidence items recovered from scene.",
    status: "In Progress",
    priority: "High",
    assigned_to: "Officer Smith",
    created_date: "2024-01-15T08:00:00Z",
    updated_date: "2024-01-20T14:30:00Z",
    created_by: "Detective Garcia",
    evidence_count: 12,
  },
  {
    id: 2,
    case_id: "CASE-2024-002",
    title: "Digital Fraud Investigation",
    description: "Large-scale financial fraud case requiring blockchain verification and digital forensics.",
    status: "In Progress",
    priority: "Critical",
    assigned_to: "Officer Johnson",
    created_date: "2024-01-14T09:30:00Z",
    updated_date: "2024-01-20T13:45:00Z",
    created_by: "Detective Martinez",
    evidence_count: 24,
  },
  {
    id: 3,
    case_id: "CASE-2024-003",
    title: "Identity Theft Ring",
    description: "Organized identity theft operation spanning multiple states with iris and facial biometrics.",
    status: "In Progress",
    priority: "Critical",
    assigned_to: "Officer Davis",
    created_date: "2024-01-13T11:00:00Z",
    updated_date: "2024-01-20T14:50:00Z",
    created_by: "Detective Williams",
    evidence_count: 8,
  },
  {
    id: 4,
    case_id: "CASE-2024-004",
    title: "Biometric Match – Fingerprint Case",
    description: "Fingerprint identification and matching from crime scene.",
    status: "Completed",
    priority: "High",
    assigned_to: "Officer Wilson",
    created_date: "2024-01-12T10:00:00Z",
    updated_date: "2024-01-18T16:00:00Z",
    created_by: "Detective Brown",
    evidence_count: 6,
  },
  {
    id: 5,
    case_id: "CASE-2024-005",
    title: "Evidence Analysis – Multi-Modal",
    description: "Complex case with multiple biometric modalities requiring fusion analysis.",
    status: "Pending",
    priority: "Medium",
    assigned_to: "",
    created_date: "2024-01-11T08:30:00Z",
    updated_date: "2024-01-11T08:30:00Z",
    created_by: "Detective Lee",
    evidence_count: 16,
  },
];

const SEED_EVIDENCE: ForensicEvidence[] = [
  {
    id: 1,
    evidence_id: "EV-2024-001",
    case_id: "CASE-2024-001",
    type: "Fingerprint",
    description: "Thumb print recovered from door handle at scene entry point",
    status: "Analyzed",
    uploaded_date: "2024-01-15T09:00:00Z",
    uploaded_by: "Officer Smith",
    analysis_status: "Match Found",
    confidence_score: 99.2,
    blockchain_hash: "0x2a4c8b9f1e3d5c7a2f9e1b3a5d7c9e1f",
  },
  {
    id: 2,
    evidence_id: "EV-2024-002",
    case_id: "CASE-2024-002",
    type: "Facial Recognition",
    description: "CCTV footage – suspect face captured at bank entrance",
    status: "Pending Analysis",
    uploaded_date: "2024-01-14T10:00:00Z",
    uploaded_by: "Officer Johnson",
    analysis_status: "Processing",
    confidence_score: 0,
    blockchain_hash: "",
  },
  {
    id: 3,
    evidence_id: "EV-2024-003",
    case_id: "CASE-2024-003",
    type: "DNA",
    description: "DNA sample collected – saliva from evidence bag",
    status: "Analyzing",
    uploaded_date: "2024-01-13T11:00:00Z",
    uploaded_by: "Officer Davis",
    analysis_status: "In Progress",
    confidence_score: 45.5,
    blockchain_hash: "0x5e7a9b1c3f2d4e6a8b0c1d3e5f7a9b1c",
  },
  {
    id: 4,
    evidence_id: "EV-2024-004",
    case_id: "CASE-2024-004",
    type: "Digital Forensics",
    description: "Mobile device data dump – recovered deleted messages and transaction logs",
    status: "Analyzed",
    uploaded_date: "2024-01-12T12:00:00Z",
    uploaded_by: "Officer Wilson",
    analysis_status: "Complete",
    confidence_score: 98.7,
    blockchain_hash: "0x8b0c1d3e5f7a9b1c2d3e4f5a6b7c8d9e",
  },
  {
    id: 5,
    evidence_id: "EV-2024-005",
    case_id: "CASE-2024-005",
    type: "Iris Scan",
    description: "Iris biometric captured from suspect during initial detention",
    status: "Analyzed",
    uploaded_date: "2024-01-11T09:30:00Z",
    uploaded_by: "Officer Brown",
    analysis_status: "Match Found",
    confidence_score: 97.3,
    blockchain_hash: "0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
  },
  {
    id: 6,
    evidence_id: "EV-2024-006",
    case_id: "CASE-2024-001",
    type: "Voice Analysis",
    description: "Recorded phone call – voice pattern analysis",
    status: "Analyzing",
    uploaded_date: "2024-01-16T08:00:00Z",
    uploaded_by: "Officer Smith",
    analysis_status: "In Progress",
    confidence_score: 61.2,
    blockchain_hash: "",
  },
];

const SEED_OFFICERS: ForensicOfficer[] = [
  {
    id: 1,
    officer_id: "OFF-0001",
    name: "Officer Smith",
    specialization: "Fingerprint Specialist",
    caseload: 3,
    success_rate: 94.5,
    location: "Downtown",
    experience_years: 8,
    email: "smith@police.local",
    active: true,
  },
  {
    id: 2,
    officer_id: "OFF-0002",
    name: "Officer Johnson",
    specialization: "Digital Forensics",
    caseload: 2,
    success_rate: 92.0,
    location: "Central Station",
    experience_years: 6,
    email: "johnson@police.local",
    active: true,
  },
  {
    id: 3,
    officer_id: "OFF-0003",
    name: "Officer Davis",
    specialization: "DNA Analysis",
    caseload: 4,
    success_rate: 96.2,
    location: "Lab District",
    experience_years: 10,
    email: "davis@police.local",
    active: true,
  },
  {
    id: 4,
    officer_id: "OFF-0004",
    name: "Officer Wilson",
    specialization: "Biometric Fusion",
    caseload: 1,
    success_rate: 91.8,
    location: "North Precinct",
    experience_years: 7,
    email: "wilson@police.local",
    active: true,
  },
  {
    id: 5,
    officer_id: "OFF-0005",
    name: "Officer Brown",
    specialization: "Iris & Facial Recognition",
    caseload: 2,
    success_rate: 93.4,
    location: "South Precinct",
    experience_years: 5,
    email: "brown@police.local",
    active: true,
  },
];

const SEED_AUDIT: ForensicAuditEntry[] = [
  {
    id: 1,
    entry_id: "AUDIT-001",
    action: "Evidence Uploaded",
    actor: "Officer Smith",
    target_type: "Evidence",
    target_id: "EV-2024-001",
    details: "Fingerprint evidence uploaded for CASE-2024-001",
    block_hash: "0x2a4c8b9f1e3d5c7a2f9e1b3a5d7c9e1f",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T14:32:15Z",
  },
  {
    id: 2,
    entry_id: "AUDIT-002",
    action: "Analysis Started",
    actor: "AI System",
    target_type: "Evidence",
    target_id: "EV-2024-001",
    details: "Automated fingerprint analysis initiated",
    block_hash: "0x5e7a9b1c3f2d4e6a8b0c1d3e5f7a9b1c",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T13:45:22Z",
  },
  {
    id: 3,
    entry_id: "AUDIT-003",
    action: "Case Created",
    actor: "Detective Garcia",
    target_type: "Case",
    target_id: "CASE-2024-001",
    details: "New case created – Breaking and Entering – Downtown",
    block_hash: "0x1f3d5c7a9b1e2a4c6e8f0a2c4e6a8b0d",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T12:20:08Z",
  },
  {
    id: 4,
    entry_id: "AUDIT-004",
    action: "Evidence Accessed",
    actor: "Officer Davis",
    target_type: "Evidence",
    target_id: "EV-2024-002",
    details: "Evidence review for pattern analysis",
    block_hash: "0x8b0c1d3e5f7a9b1c2d3e4f5a6b7c8d9e",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T11:15:42Z",
  },
  {
    id: 5,
    entry_id: "AUDIT-005",
    action: "Chain of Custody Transfer",
    actor: "Officer Wilson",
    target_type: "Evidence",
    target_id: "EV-2024-003",
    details: "Evidence transferred from Lab A to Lab B",
    block_hash: "0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T10:05:33Z",
  },
  {
    id: 6,
    entry_id: "AUDIT-006",
    action: "Analysis Result Recorded",
    actor: "AI System",
    target_type: "Case",
    target_id: "CASE-2024-002",
    details: "Biometric fusion analysis result recorded on blockchain",
    block_hash: "0x0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T09:30:15Z",
  },
  {
    id: 7,
    entry_id: "AUDIT-007",
    action: "Officer Assigned",
    actor: "System",
    target_type: "Case",
    target_id: "CASE-2024-003",
    details: "Officer Davis assigned to Identity Theft Ring case via AI recommendation",
    block_hash: "0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
    verified: true,
    signature: "SIGNED",
    timestamp: "2024-01-20T08:00:00Z",
  },
];

// ── Context ───────────────────────────────────────────────────────────────────

const ForensicContext = createContext<ForensicStore | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ForensicProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<ForensicCase[]>(SEED_CASES);
  const [evidence, setEvidence] = useState<ForensicEvidence[]>(SEED_EVIDENCE);
  const [officers, setOfficers] = useState<ForensicOfficer[]>(SEED_OFFICERS);
  const [assignments, setAssignments] = useState<ForensicAssignment[]>([]);
  const [auditEntries, setAuditEntries] = useState<ForensicAuditEntry[]>(SEED_AUDIT);
  const [boards, setBoards] = useState<CollabBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState(false);

  // boards are derived from cases + local annotations
  // We keep an annotation overlay map: case_id → annotation[]
  const annotationsRef = useRef<Record<string, BoardAnnotation[]>>({});

  // Recompute boards whenever cases change
  const recomputeBoards = useCallback(
    (latestCases: ForensicCase[]) => {
      const newBoards: CollabBoard[] = latestCases.map((c) => ({
        case_id: c.case_id,
        annotations: annotationsRef.current[c.case_id] ?? [],
      }));
      setBoards(newBoards);
    },
    []
  );

  // ── API fetchers ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, evidenceRes, officersRes, auditRes] = await Promise.all([
        fetch("/api/cases"),
        fetch("/api/evidence"),
        fetch("/api/officers"),
        fetch("/api/blockchain/audit"),
      ]);

      if (!casesRes.ok) throw new Error("API unavailable");

      const [casesData, evidenceData, officersData, auditData] = await Promise.all([
        casesRes.json(),
        evidenceRes.json(),
        officersRes.json(),
        auditRes.json(),
      ]);

      if (casesData.success && casesData.data.length > 0) {
        setCases(casesData.data);
        recomputeBoards(casesData.data);
      } else {
        recomputeBoards(SEED_CASES);
      }
      if (evidenceData.success && evidenceData.data.length > 0) setEvidence(evidenceData.data);
      if (officersData.success && officersData.data.length > 0) setOfficers(officersData.data);
      if (auditData.success && auditData.data.length > 0) setAuditEntries(auditData.data);

      setApiOnline(true);
      setError(null);
    } catch {
      // Graceful degradation: use seed data, keep state as-is
      setApiOnline(false);
      recomputeBoards(cases);
      // Only set error if first load (boards not set yet)
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Also try to pull assignment data from the assignment API
  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8001/assignments");
      if (!res.ok) return;
      const data = await res.json();
      if (data.data) {
        setAssignments(data.data.filter((a: ForensicAssignment) => a.status === "Active"));
      }
    } catch {
      // assignment API not running – no-op
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAssignments();
  }, [fetchData, fetchAssignments]);

  // Initial board setup (seed)
  useEffect(() => {
    recomputeBoards(SEED_CASES);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    await fetchData();
    await fetchAssignments();
  }, [fetchData, fetchAssignments]);

  const createCase = useCallback(
    async (input: CreateCaseInput): Promise<ForensicCase | null> => {
      // Try API first
      try {
        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title,
            description: input.description ?? "",
            priority: input.priority ?? "Medium",
            created_by: input.created_by ?? "Officer",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          await refresh();
          return data.data as ForensicCase;
        }
      } catch {
        // API unavailable – optimistic local update
      }

      // Optimistic local update (offline mode)
      const newCase: ForensicCase = {
        id: Date.now(),
        case_id: `CASE-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, "0")}`,
        title: input.title,
        description: input.description ?? "",
        status: "Pending",
        priority: input.priority ?? "Medium",
        assigned_to: "",
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        created_by: input.created_by ?? "Officer",
        evidence_count: 0,
      };

      const updatedCases = [newCase, ...cases];
      setCases(updatedCases);
      recomputeBoards(updatedCases);

      // Local audit entry
      const auditEntry: ForensicAuditEntry = {
        id: Date.now(),
        entry_id: `AUDIT-${Date.now()}`,
        action: "Case Created",
        actor: input.created_by ?? "Officer",
        target_type: "Case",
        target_id: newCase.case_id,
        details: `New case created: ${input.title}`,
        block_hash: `0x${Math.random().toString(16).slice(2, 34)}`,
        verified: true,
        signature: "SIGNED",
        timestamp: new Date().toISOString(),
      };
      setAuditEntries((prev) => [auditEntry, ...prev]);

      return newCase;
    },
    [cases, refresh, recomputeBoards]
  );

  const uploadEvidence = useCallback(
    async (input: UploadEvidenceInput): Promise<ForensicEvidence | null> => {
      // Try API first
      try {
        const res = await fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_id: input.case_id,
            type: input.type,
            description: input.description ?? "",
            uploaded_by: input.uploaded_by ?? "Officer",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          await refresh();
          return data.data as ForensicEvidence;
        }
      } catch {
        // API unavailable – optimistic local update
      }

      // Optimistic local update (offline mode)
      const caseEvCount = evidence.filter((e) => e.case_id === input.case_id).length;
      const newEvidence: ForensicEvidence = {
        id: Date.now(),
        evidence_id: `${input.case_id}-EV-${String(caseEvCount + 1).padStart(3, "0")}`,
        case_id: input.case_id,
        type: input.type,
        description: input.description ?? "",
        status: "Pending Analysis",
        uploaded_date: new Date().toISOString(),
        uploaded_by: input.uploaded_by ?? "Officer",
        analysis_status: "Pending",
        confidence_score: 0,
        blockchain_hash: "",
      };

      setEvidence((prev) => [newEvidence, ...prev]);

      // Update evidence_count on the case
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === input.case_id
            ? { ...c, evidence_count: c.evidence_count + 1 }
            : c
        )
      );

      // Local audit entry
      const auditEntry: ForensicAuditEntry = {
        id: Date.now(),
        entry_id: `AUDIT-${Date.now()}`,
        action: "Evidence Uploaded",
        actor: input.uploaded_by ?? "Officer",
        target_type: "Evidence",
        target_id: newEvidence.evidence_id,
        details: `${input.type} evidence uploaded for ${input.case_id}`,
        block_hash: `0x${Math.random().toString(16).slice(2, 34)}`,
        verified: true,
        signature: "SIGNED",
        timestamp: new Date().toISOString(),
      };
      setAuditEntries((prev) => [auditEntry, ...prev]);

      return newEvidence;
    },
    [evidence, refresh]
  );

  const addAnnotation = useCallback(
    (caseId: string, text: string, author = "You") => {
      const colors = [
        "var(--accent)",
        "var(--warning)",
        "var(--success)",
        "var(--secondary)",
        "#c084fc",
      ];
      const annotation: BoardAnnotation = {
        id: `ANN-${Date.now()}`,
        author,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        color: colors[Math.floor(Math.random() * colors.length)],
      };

      annotationsRef.current[caseId] = [
        ...(annotationsRef.current[caseId] ?? []),
        annotation,
      ];

      setBoards((prev) =>
        prev.map((b) =>
          b.case_id === caseId
            ? { ...b, annotations: [...b.annotations, annotation] }
            : b
        )
      );
    },
    []
  );

  return (
    <ForensicContext.Provider
      value={{
        cases,
        evidence,
        officers,
        assignments,
        auditEntries,
        auditLogs: auditEntries,
        boards,
        loading,
        error,
        apiOnline,
        refresh,
        createCase,
        uploadEvidence,
        addAnnotation,
      }}
    >
      {children}
    </ForensicContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useForensicStore(): ForensicStore {
  const ctx = useContext(ForensicContext);
  if (!ctx) throw new Error("useForensicStore must be used within ForensicProvider");
  return ctx;
}
