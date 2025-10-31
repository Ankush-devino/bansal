// Cases
export interface Case {
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
  resolution_time_days: number;
  evidence_count: number;
}

// Evidence
export interface Evidence {
  id: number;
  evidence_id: string;
  case_id: string;
  type: "Fingerprint" | "Facial Recognition" | "DNA" | "Digital Forensics" | "Iris Scan" | "Voice Analysis";
  description: string;
  status: "Pending Analysis" | "Analyzing" | "Analyzed";
  uploaded_date: string;
  uploaded_by: string;
  analysis_status: string;
  confidence_score: number;
  ipfs_hash: string;
  blockchain_hash: string;
  created_date: string;
}

// Officers
export interface Officer {
  id: number;
  officer_id: string;
  name: string;
  specialization: string;
  caseload: number;
  success_rate: number;
  location: string;
  experience_years: number;
  email: string;
  phone: string;
  active: boolean;
  created_date: string;
}

// Case Assignments
export interface CaseAssignment {
  id: number;
  case_id: string;
  officer_id: string;
  assigned_date: string;
  match_score: number;
  status: string;
  notes: string;
}

// Biometric Results
export interface BiometricResult {
  id: number;
  result_id: string;
  case_id: string;
  evidence_id: string;
  suspect_id: string;
  suspect_name: string;
  match_score: number;
  consensus_result: string;
  verified: boolean;
  fingerprint_confidence: number;
  facial_confidence: number;
  iris_confidence: number;
  voice_confidence: number;
  created_date: string;
}

// Reports
export interface Report {
  id: number;
  report_id: string;
  case_id: string;
  type: string;
  status: "Pending Review" | "In Progress" | "Completed";
  pages: number;
  ai_generated: boolean;
  reviewed: boolean;
  reviewed_by: string;
  content: string;
  generated_date: string;
  reviewed_date: string;
}

// Audit Trail
export interface AuditEntry {
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

// Pattern Matches
export interface PatternMatch {
  id: number;
  current_case_id: string;
  matched_case_id: string;
  similarity_score: number;
  pattern_type: string;
  description: string;
  created_date: string;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Assignment Recommendation
export interface AssignmentRecommendation {
  officer_id: string;
  name: string;
  specialization: string;
  match_score: number;
  caseload: number;
  success_rate: number;
  location: string;
  experience_years: number;
}

// Dashboard Stats
export interface DashboardStats {
  total_cases: number;
  active_cases: number;
  completed_cases: number;
  total_evidence: number;
  pending_evidence: number;
  pattern_matches_today: number;
  average_resolution_time: number;
  blockchain_verified_entries: number;
}
