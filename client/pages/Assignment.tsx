import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import "../styles/assignment.css";

const API = "http://localhost:8001";

// ── Types ────────────────────────────────────────────────────────────────────

interface Officer {
  id: string;
  name: string;
  rank: string;
  specialization: string;
  skills: string[];
  location: string;
  state: string;
  experience_years: number;
  success_rate: number;
  caseload: number;
  max_caseload: number;
  availability: number;
  active: boolean;
}

interface Case {
  id: string;
  title: string;
  crime_type: string;
  evidence_types: string[];
  priority: "Critical" | "High" | "Medium" | "Low";
  complexity: "High" | "Medium" | "Low";
  location: string;
  state: string;
  estimated_days: number;
  description: string;
  assigned: boolean;
  assignment?: Assignment;
}

interface Recommendation {
  officer_id: string;
  name: string;
  rank: string;
  specialization: string;
  location: string;
  state: string;
  experience_years: number;
  success_rate: number;
  caseload: number;
  max_caseload: number;
  match_score: number;
  already_assigned: boolean;
  factors: {
    specialization_match: number;
    workload_available: number;
    success_rate: number;
    proximity_score: number;
    distance_km: number;
  };
}

interface Assignment {
  id: string;
  case_id: string;
  case_title: string;
  officer_id: string;
  officer_name: string;
  match_score: number;
  status: string;
  assigned_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function prioClass(p: string) {
  return `prio-${p.toLowerCase()}`;
}

function Bar({ value, cls }: { value: number; cls: string }) {
  return (
    <div className="assign-factor-bar-wrap">
      <div
        className={`assign-factor-bar ${cls}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Assignment() {
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [modelMeta, setModelMeta] = useState<any>(null);

  // ── fetch helpers ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [casesRes, officersRes, assignRes, healthRes] = await Promise.all([
        fetch(`${API}/cases`),
        fetch(`${API}/officers`),
        fetch(`${API}/assignments`),
        fetch(`${API}/health`),
      ]);
      if (!casesRes.ok) throw new Error("API down");
      const [c, o, a, h] = await Promise.all([
        casesRes.json(),
        officersRes.json(),
        assignRes.json(),
        healthRes.json(),
      ]);
      setCases(c.data);
      setOfficers(o.data);
      setAssignments(a.data.filter((x: Assignment) => x.status === "Active"));
      setModelMeta(h);
      setApiReady(true);
    } catch {
      setApiReady(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchRecommendations = useCallback(async (caseId: string) => {
    setLoadingRecs(true);
    setRecommendations([]);
    try {
      const res = await fetch(`${API}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecommendations(data.recommendations);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  const handleSelectCase = (c: Case) => {
    setSelectedCase(c);
    fetchRecommendations(c.id);
  };

  const handleAssign = async (officerId: string) => {
    if (!selectedCase) return;
    setAssigningId(officerId);
    try {
      const res = await fetch(`${API}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: selectedCase.id, officer_id: officerId }),
      });
      if (!res.ok) throw new Error();
      await fetchAll();
      await fetchRecommendations(selectedCase.id);
      // refresh selected case
      const refreshed = await fetch(`${API}/cases`).then(r => r.json());
      const updatedCase = refreshed.data.find((c: Case) => c.id === selectedCase.id);
      if (updatedCase) setSelectedCase(updatedCase);
    } catch {
      alert("Failed to assign case. Please try again.");
    } finally {
      setAssigningId(null);
    }
  };

  const handleUnassign = async (caseId: string) => {
    try {
      await fetch(`${API}/assignments/${caseId}`, { method: "DELETE" });
      await fetchAll();
      if (selectedCase?.id === caseId) {
        await fetchRecommendations(caseId);
        const refreshed = await fetch(`${API}/cases`).then(r => r.json());
        const updatedCase = refreshed.data.find((c: Case) => c.id === caseId);
        if (updatedCase) setSelectedCase(updatedCase);
      }
    } catch {
      alert("Failed to unassign.");
    }
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const activeAssignments = assignments.filter(a => a.status === "Active").length;
  const avgScore = assignments.length
    ? Math.round(assignments.reduce((s, a) => s + a.match_score, 0) / assignments.length)
    : 0;
  const assignedOfficerIds = new Set(assignments.map(a => a.officer_id));

  return (
    <div className="assign-page">
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="page-main" style={{ flex: 1, padding: "1.5rem 2rem" }}>

          {/* Header */}
          <div className="assign-header">
            <div className="assign-header-icon">🎯</div>
            <div>
              <h1>Smart Case Assignment</h1>
              <p>AI-powered officer matching — specialization · workload · success rate · proximity</p>
            </div>
            <div className={`assign-api-badge ${apiReady === false ? "offline" : ""}`}>
              <span className="assign-api-dot" />
              {apiReady === null ? "Checking…" : apiReady ? `Model Ready • R²=${modelMeta?.r2 ?? "…"}` : "API Offline"}
            </div>
          </div>

          {/* API offline banner */}
          {apiReady === false && (
            <div className="assign-api-error">
              ⚠️ Assignment API not running. Start it with:&nbsp;
              <code style={{ fontFamily: "monospace" }}>assignment_api\start.bat</code>
            </div>
          )}

          {/* Stats */}
          <div className="assign-stats">
            <div className="assign-stat-card">
              <div className="assign-stat-val">{cases.length}</div>
              <div className="assign-stat-label">Total Cases</div>
            </div>
            <div className="assign-stat-card">
              <div className="assign-stat-val" style={{ color: "#fb923c" }}>
                {cases.filter(c => !c.assigned).length}
              </div>
              <div className="assign-stat-label">Pending Assignment</div>
            </div>
            <div className="assign-stat-card">
              <div className="assign-stat-val" style={{ color: "#4ade80" }}>{activeAssignments}</div>
              <div className="assign-stat-label">Active Assignments</div>
            </div>
            <div className="assign-stat-card">
              <div className="assign-stat-val" style={{ color: "#fbbf24" }}>
                {avgScore > 0 ? `${avgScore}%` : "—"}
              </div>
              <div className="assign-stat-label">Avg Match Score</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="assign-grid">

            {/* Left — Cases */}
            <div className="assign-panel">
              <div className="assign-panel-title">
                <span>📋</span> Cases Pending Assignment
                <span style={{ marginLeft: "auto", color: "#fb923c" }}>
                  {cases.filter(c => !c.assigned).length} pending
                </span>
              </div>
              <div className="assign-case-list">
                {cases.length === 0 && (
                  <div className="assign-empty">
                    <span className="assign-empty-icon">📋</span>
                    <span>Loading cases…</span>
                  </div>
                )}
                {cases.map(c => {
                  const assignment = assignments.find(a => a.case_id === c.id);
                  return (
                    <button
                      key={c.id}
                      className={`assign-case-card ${selectedCase?.id === c.id ? "active" : ""} ${c.assigned ? "done" : ""}`}
                      onClick={() => handleSelectCase(c)}
                    >
                      <div className="assign-case-top">
                        <span className="assign-case-id">{c.id}</span>
                        <span className={`assign-priority-badge ${prioClass(c.priority)}`}>
                          {c.priority}
                        </span>
                      </div>
                      <div className="assign-case-title">{c.title}</div>
                      <div className="assign-case-meta">
                        <span>📍 {c.location}</span>
                        <span>⚖️ {c.complexity}</span>
                        <span>⏱ ~{c.estimated_days}d</span>
                      </div>
                      {assignment && (
                        <div className="assign-case-assigned-to">
                          ✅ {assignment.officer_name} ({assignment.match_score}%)
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right — Recommendations */}
            <div>
              {!selectedCase ? (
                <div className="assign-panel">
                  <div className="assign-empty">
                    <span className="assign-empty-icon">👈</span>
                    <span>Select a case to see AI-powered officer recommendations</span>
                  </div>
                </div>
              ) : (
                <div className="assign-panel">
                  {/* Case info header */}
                  <div className="assign-rec-header">
                    <div className="assign-rec-case-title">{selectedCase.title}</div>
                    <div className="assign-rec-case-sub">
                      {selectedCase.id} · {selectedCase.location}, {selectedCase.state} · ~{selectedCase.estimated_days} days
                    </div>
                    <div className="assign-rec-case-sub" style={{ marginTop: "0.25rem", color: "var(--text-muted)" }}>
                      {selectedCase.description}
                    </div>
                    <div className="assign-rec-tags">
                      {selectedCase.evidence_types.map(e => (
                        <span key={e} className="assign-evidence-tag">{e}</span>
                      ))}
                    </div>
                  </div>

                  {loadingRecs ? (
                    <div className="assign-empty" style={{ minHeight: 200 }}>
                      <span className="assign-spinner" />
                      <span>AI ranking officers…</span>
                    </div>
                  ) : (
                    <div className="assign-rec-list">
                      {recommendations.map((rec, idx) => {
                        const isAssigned = assignments.some(
                          a => a.case_id === selectedCase.id && a.officer_id === rec.officer_id && a.status === "Active"
                        );
                        const isBusy = rec.caseload >= rec.max_caseload;
                        const isAssigning = assigningId === rec.officer_id;

                        return (
                          <div key={rec.officer_id} className="assign-officer-card">
                            {/* Top row */}
                            <div className="assign-officer-top">
                              <div>
                                <div className="assign-officer-name">{rec.name}</div>
                                <div className="assign-officer-rank">{rec.rank}</div>
                                <div className="assign-officer-spec">{rec.specialization}</div>
                              </div>
                              <div className="assign-match-score">
                                <div className="assign-match-num">{rec.match_score}</div>
                                <div className="assign-match-label">match %</div>
                              </div>
                            </div>

                            {/* Officer meta */}
                            <div className="assign-officer-meta">
                              <span>📍 {rec.location}, {rec.state}</span>
                              <span>🗂 {rec.caseload}/{rec.max_caseload} cases</span>
                              <span>⭐ {rec.success_rate}% success</span>
                              <span>🕒 {rec.experience_years}y exp</span>
                              {rec.factors.distance_km > 0 && (
                                <span>📏 {rec.factors.distance_km}km away</span>
                              )}
                            </div>

                            {/* Factor bars */}
                            <div className="assign-factors">
                              <div className="assign-factor">
                                <div className="assign-factor-label">Specialization Match</div>
                                <Bar value={rec.factors.specialization_match} cls="bar-spec" />
                                <div className="assign-factor-val">{rec.factors.specialization_match}%</div>
                              </div>
                              <div className="assign-factor">
                                <div className="assign-factor-label">Workload Available</div>
                                <Bar value={rec.factors.workload_available} cls="bar-workload" />
                                <div className="assign-factor-val">{rec.factors.workload_available}%</div>
                              </div>
                              <div className="assign-factor">
                                <div className="assign-factor-label">Success Rate</div>
                                <Bar value={rec.factors.success_rate} cls="bar-success" />
                                <div className="assign-factor-val">{rec.factors.success_rate}%</div>
                              </div>
                              <div className="assign-factor">
                                <div className="assign-factor-label">Geographic Proximity</div>
                                <Bar value={rec.factors.proximity_score} cls="bar-prox" />
                                <div className="assign-factor-val">{rec.factors.proximity_score}%</div>
                              </div>
                            </div>

                            {/* Action button */}
                            {isAssigned ? (
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button className="assign-btn assign-btn-assigned" style={{ flex: 1 }}>
                                  ✅ Currently Assigned
                                </button>
                                <button
                                  className="assign-btn assign-btn-danger"
                                  style={{ flex: "0 0 auto", width: "auto", padding: "0.6rem 1rem" }}
                                  onClick={() => handleUnassign(selectedCase.id)}
                                >
                                  Unassign
                                </button>
                              </div>
                            ) : (
                              <button
                                className="assign-btn assign-btn-primary"
                                disabled={isBusy || isAssigning || !!assigningId}
                                onClick={() => handleAssign(rec.officer_id)}
                              >
                                {isAssigning ? (
                                  <><span className="assign-spinner" />Assigning…</>
                                ) : isBusy ? (
                                  "⚠️ Officer at Full Capacity"
                                ) : (
                                  `Assign to ${rec.name.split(" ")[0]} ${rec.name.split(" ").slice(-1)[0]}`
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Active assignments log */}
              {assignments.length > 0 && (
                <div className="assign-log">
                  <div className="assign-log-header">📋 Active Assignments ({assignments.length})</div>
                  <div className="assign-log-list">
                    {assignments.map(a => (
                      <div key={a.id} className="assign-log-row">
                        <span className="assign-log-case">{a.case_id}</span>
                        <span className="assign-log-officer">→ {a.officer_name}</span>
                        <span className="assign-log-score">{a.match_score}%</span>
                        <button
                          className="assign-log-unassign"
                          onClick={() => handleUnassign(a.case_id)}
                        >
                          Unassign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Factors Info */}
          <div className="assign-factors-info">
            <div className="assign-panel-title">
              <span>🤖</span> AI Scoring Weights
              {modelMeta && (
                <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  Model: {modelMeta.model} · MAE {modelMeta.mae} pts · R² {modelMeta.r2}
                </span>
              )}
            </div>
            <div className="assign-factors-grid">
              {[
                { label: "Specialization Match", weight: "35%", color: "#00d4ff", desc: "Matches officer skills with case evidence types (fingerprint, DNA, digital, etc.)" },
                { label: "Workload Balance", weight: "25%", color: "#4ade80", desc: "Officers with fewer active cases get higher priority to balance team load" },
                { label: "Success History", weight: "25%", color: "#fbbf24", desc: "Officer's historical case resolution rate from past assignments" },
                { label: "Geographic Proximity", weight: "15%", color: "#c084fc", desc: "Distance between officer's station and the crime location across India" },
              ].map(f => (
                <div key={f.label} className="assign-factor-info">
                  <div className="assign-factor-info-weight" style={{ color: f.color }}>{f.weight}</div>
                  <div className="assign-factor-info-label">{f.label}</div>
                  <p className="assign-factor-info-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
