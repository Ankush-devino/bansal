import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import { useForensicStore } from "@/hooks/useForensicStore";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { id: "tm1", name: "Dr. Priya Sharma",    role: "Lead Forensic Analyst",    avatar: "PS", color: "#00d4ff" },
  { id: "tm2", name: "Officer Arjun Singh",  role: "Digital Forensics Expert",  avatar: "AS", color: "#c084fc" },
  { id: "tm3", name: "Kavya Nair",           role: "Evidence Specialist",       avatar: "KN", color: "#10b981" },
  { id: "tm4", name: "Inspector Dev Mehta",  role: "Senior Investigator",       avatar: "DM", color: "#f59e0b" },
  { id: "tm5", name: "Rahul Verma",          role: "Biometric Analyst",         avatar: "RV", color: "#e94560" },
];

const statusColor = (s: string) => {
  switch (s?.toLowerCase()) {
    case "in progress": return { bg: "rgba(0,212,255,0.1)",   text: "#00d4ff" };
    case "completed":   return { bg: "rgba(16,185,129,0.1)",  text: "#10b981" };
    case "on hold":     return { bg: "rgba(239,68,68,0.1)",   text: "#ef4444" };
    default:            return { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b" };
  }
};

const priorityColor = (p: string) => {
  switch (p?.toLowerCase()) {
    case "critical": return "#ef4444";
    case "high":     return "#e94560";
    case "medium":   return "#f59e0b";
    default:         return "#10b981";
  }
};

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Comment / Annotation ──────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: string;
  avatar: string;
  color: string;
  text: string;
  timestamp: string;
  caseId: string;
  important?: boolean;
}

const SEED_COMMENTS: Comment[] = [
  { id: "c1", author: "Dr. Priya Sharma", avatar: "PS", color: "#00d4ff", text: "Fingerprint samples have been processed. Confidence score of 94.2% – recommend escalation to court.", timestamp: new Date(Date.now() - 3_600_000).toISOString(), caseId: "", important: true },
  { id: "c2", author: "Officer Arjun Singh", avatar: "AS", color: "#c084fc", text: "Digital forensics on the seized device revealed encrypted communication logs. Running decryption algorithms.", timestamp: new Date(Date.now() - 7_200_000).toISOString(), caseId: "" },
  { id: "c3", author: "Inspector Dev Mehta", avatar: "DM", color: "#f59e0b", text: "Awaiting lab results on DNA samples. Estimated 48-hour turnaround.", timestamp: new Date(Date.now() - 14_400_000).toISOString(), caseId: "" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Collaboration() {
  const { cases, evidence, assignments, officers, loading, apiOnline } = useForensicStore();

  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS.map(c => ({
    ...c, caseId: cases[0]?.case_id ?? ""
  })));
  const [newComment, setNewComment] = useState("");
  const [activeAuthor, setActiveAuthor] = useState(TEAM_MEMBERS[0]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [tab, setTab] = useState<"board" | "team" | "notes">("board");

  // Sync seed comment case IDs once cases load
  const firstCaseId = cases[0]?.case_id ?? "";
  const selectedCase = activeCaseId
    ? cases.find(c => c.case_id === activeCaseId)
    : cases[0];

  const filteredCases = filterStatus === "All" ? cases : cases.filter(c => c.status === filterStatus);

  const caseEvidence = selectedCase ? evidence.filter(e => e.case_id === selectedCase.case_id) : [];
  const caseAssignment = selectedCase ? assignments.find(a => a.case_id === selectedCase?.case_id && a.status === "Active") : null;
  const caseComments = comments.filter(c => c.caseId === (selectedCase?.case_id ?? firstCaseId));

  const addComment = () => {
    if (!newComment.trim()) return;
    const newC: Comment = {
      id: `c${Date.now()}`,
      author: activeAuthor.name,
      avatar: activeAuthor.avatar,
      color: activeAuthor.color,
      text: newComment.trim(),
      timestamp: new Date().toISOString(),
      caseId: selectedCase?.case_id ?? firstCaseId,
      important: false,
    };
    setComments(prev => [newC, ...prev]);
    setNewComment("");
  };

  // Kanban columns
  const columns: { status: string; label: string; icon: string; color: string }[] = [
    { status: "Pending",     label: "Pending",     icon: "⏳", color: "#f59e0b" },
    { status: "In Progress", label: "In Progress", icon: "🔍", color: "#00d4ff" },
    { status: "Completed",   label: "Completed",   icon: "✅", color: "#10b981" },
    { status: "On Hold",     label: "On Hold",     icon: "⏸", color: "#ef4444" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--background)" }}>
      <Navbar />
      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />
        <main className="page-main">

          {/* ── Header ── */}
          <div className="page-header">
            <div className="page-title">
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "linear-gradient(135deg,#10b981,#059669)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"
              }}>🤝</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "var(--text-3xl)" }}>Collaboration</h1>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  {cases.length} cases · {officers.length} officers · real-time board
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: apiOnline ? "#10b981" : "#f59e0b", display: "inline-block", boxShadow: apiOnline ? "0 0 6px #10b981" : "0 0 6px #f59e0b" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{apiOnline ? "Live" : "Offline"}</span>
              </div>
            </div>
            {/* Active team avatars */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginRight: "0.25rem" }}>Online:</span>
              {TEAM_MEMBERS.slice(0, 4).map(m => (
                <div key={m.id} title={m.name} style={{
                  width: 34, height: 34, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontWeight: 800,
                  fontSize: 12, background: m.color, color: "#0f0f1e",
                  border: "2px solid var(--surface)", cursor: "pointer",
                  boxShadow: `0 0 6px ${m.color}80`,
                  transition: "all 0.2s",
                }} onClick={() => setActiveAuthor(m)}>
                  {m.avatar}
                </div>
              ))}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="tabs">
            {[
              { key: "board", label: "📋 Kanban Board" },
              { key: "team",  label: "👥 Team & Officers" },
              { key: "notes", label: "💬 Case Annotations" },
            ].map(t => (
              <button key={t.key} className={`tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key as any)}>{t.label}</button>
            ))}
          </div>

          {/* ═══════════ TAB: KANBAN BOARD ═══════════ */}
          {tab === "board" && (
            <div>
              {/* Filter bar */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                {["All","Pending","In Progress","Completed","On Hold"].map(s => (
                  <button key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: "6px 16px", borderRadius: 20, fontWeight: 600, fontSize: "var(--text-xs)",
                      border: filterStatus === s ? "1px solid #00d4ff" : "1px solid var(--border)",
                      background: filterStatus === s ? "rgba(0,212,255,0.12)" : "transparent",
                      color: filterStatus === s ? "#00d4ff" : "var(--text-muted)", cursor: "pointer",
                    }}>{s}</button>
                ))}
              </div>

              {loading && (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 1rem" }} />
                </div>
              )}

              {!loading && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem", overflowX: "auto" }}>
                  {columns.map(col => {
                    const colCases = filteredCases.filter(c => c.status === col.status);
                    return (
                      <div key={col.status} style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 14, overflow: "hidden", minWidth: 240
                      }}>
                        {/* Column header */}
                        <div style={{
                          padding: "0.875rem 1rem", borderBottom: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: `linear-gradient(135deg,${col.color}18,transparent)`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>{col.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: col.color }}>{col.label}</span>
                          </div>
                          <span style={{ padding: "2px 8px", borderRadius: 20, background: `${col.color}20`, color: col.color, fontSize: 11, fontWeight: 800 }}>
                            {colCases.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: 120 }}>
                          {colCases.length === 0 && (
                            <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                              No cases
                            </div>
                          )}
                          {colCases.map(c => {
                            const evCount = evidence.filter(e => e.case_id === c.case_id).length;
                            const assignment = assignments.find(a => a.case_id === c.case_id && a.status === "Active");
                            return (
                              <div
                                key={c.case_id}
                                onClick={() => { setActiveCaseId(c.case_id); setTab("notes"); }}
                                style={{
                                  background: "var(--surface-light)", border: `1px solid var(--border)`,
                                  borderLeft: `3px solid ${priorityColor(c.priority)}`,
                                  borderRadius: 10, padding: "0.75rem", cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                              >
                                <div style={{ fontFamily: "var(--font-family-mono)", fontSize: 10, color: "#00d4ff", fontWeight: 700, marginBottom: "0.3rem" }}>{c.case_id}</div>
                                <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", marginBottom: "0.5rem" }}>{c.title}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                                  <span>🔬 {evCount} evidence</span>
                                  <span>👤 {assignment?.officer_name || c.assigned_to || "Unassigned"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB: TEAM & OFFICERS ═══════════ */}
          {tab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Officers from store */}
              <div>
                <h3 style={{ marginBottom: "1rem", fontSize: "var(--text-xl)" }}>👮 Assigned Officers</h3>
                {officers.length === 0 && (
                  <p style={{ color: "var(--text-muted)" }}>No officers found. Add officers through the Assignment module.</p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
                  {officers.map((o, i) => {
                    const mem = TEAM_MEMBERS[i % TEAM_MEMBERS.length];
                    const activeCases = assignments.filter(a => a.officer_id === o.officer_id && a.status === "Active").length;
                    return (
                      <div key={o.officer_id} style={{
                        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem",
                        display: "flex", gap: "1rem", alignItems: "flex-start"
                      }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                          background: `linear-gradient(135deg,${mem.color},${mem.color}80)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 15, color: "#0f0f1e",
                          boxShadow: `0 0 12px ${mem.color}50`
                        }}>{o.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "var(--text-sm)" }}>{o.name}</div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{o.specialization}</div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(0,212,255,0.1)", color: "#00d4ff" }}>
                              {activeCases} active case{activeCases !== 1 ? "s" : ""}
                            </span>
                            {o.success_rate > 0 && (
                              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                                {o.success_rate}% success
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", flexShrink: 0, marginTop: 4 }} title="Online" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Forensic team */}
              <div>
                <h3 style={{ marginBottom: "1rem", fontSize: "var(--text-xl)" }}>🔬 Forensic Team</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
                  {TEAM_MEMBERS.map(m => (
                    <div key={m.id} style={{
                      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem",
                      display: "flex", gap: "1rem", alignItems: "flex-start",
                      transition: "all 0.2s",
                    }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg,${m.color},${m.color}80)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 15, color: "#0f0f1e",
                        boxShadow: `0 0 12px ${m.color}50`
                      }}>{m.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "var(--text-sm)" }}>{m.name}</div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{m.role}</div>
                        <button
                          onClick={() => { setActiveAuthor(m); setTab("notes"); }}
                          style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40`, cursor: "pointer" }}
                        >+ Annotate as {m.avatar}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB: ANNOTATIONS / NOTES ═══════════ */}
          {tab === "notes" && (
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem" }}>
              {/* Case selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-muted)" }}>SELECT CASE</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 500, overflowY: "auto" }}>
                  {cases.map(c => {
                    const sc = statusColor(c.status);
                    const isActive = (activeCaseId || firstCaseId) === c.case_id;
                    return (
                      <div
                        key={c.case_id}
                        onClick={() => setActiveCaseId(c.case_id)}
                        style={{
                          padding: "0.75rem 1rem", borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${isActive ? "#00d4ff" : "var(--border)"}`,
                          background: isActive ? "rgba(0,212,255,0.06)" : "var(--surface)",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ fontFamily: "var(--font-family-mono)", fontSize: 10, color: "#00d4ff", fontWeight: 700 }}>{c.case_id}</div>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginTop: "0.2rem" }}>{c.title}</div>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, marginTop: "0.4rem", display: "inline-block" }}>{c.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Annotation panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {selectedCase && (
                  <div style={{ padding: "1rem 1.25rem", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-family-mono)", fontSize: 11, color: "#00d4ff", fontWeight: 700 }}>{selectedCase.case_id}</div>
                        <div style={{ fontWeight: 700, fontSize: "var(--text-lg)" }}>{selectedCase.title}</div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, ...(() => { const sc = statusColor(selectedCase.status); return { background: sc.bg, color: sc.text }; })() }}>{selectedCase.status}</span>
                      </div>
                    </div>
                    {/* Evidence mini list */}
                    {caseEvidence.length > 0 && (
                      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {caseEvidence.slice(0, 5).map(ev => (
                          <span key={ev.evidence_id} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(192,132,252,0.1)", color: "#c084fc", border: "1px solid rgba(192,132,252,0.3)" }}>
                            🔬 {ev.evidence_id}
                          </span>
                        ))}
                        {caseEvidence.length > 5 && <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "3px 0" }}>+{caseEvidence.length - 5} more</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* New comment box */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem" }}>
                  {/* Author selector */}
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                    {TEAM_MEMBERS.map(m => (
                      <div
                        key={m.id}
                        title={m.name}
                        onClick={() => setActiveAuthor(m)}
                        style={{
                          width: 30, height: 30, borderRadius: "50%", display: "flex",
                          alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11,
                          background: m.color, color: "#0f0f1e", cursor: "pointer",
                          border: activeAuthor.id === m.id ? "2px solid white" : "2px solid transparent",
                          boxShadow: activeAuthor.id === m.id ? `0 0 8px ${m.color}` : "none",
                          opacity: activeAuthor.id === m.id ? 1 : 0.5, transition: "all 0.2s",
                        }}
                      >{m.avatar}</div>
                    ))}
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", alignSelf: "center", marginLeft: "0.4rem" }}>
                      As: <strong style={{ color: activeAuthor.color }}>{activeAuthor.name}</strong>
                    </span>
                  </div>

                  <textarea
                    className="textarea"
                    style={{ minHeight: 80, marginBottom: "0.75rem" }}
                    placeholder={`Add annotation or case note as ${activeAuthor.name}…`}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addComment(); }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Ctrl+Enter to submit</span>
                    <button className="btn btn-primary btn-sm" onClick={addComment} disabled={!newComment.trim()}>
                      💬 Add Annotation
                    </button>
                  </div>
                </div>

                {/* Comments list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {caseComments.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      <span style={{ fontSize: "2rem" }}>💬</span>
                      <p style={{ margin: "0.5rem 0 0" }}>No annotations yet for this case</p>
                    </div>
                  )}
                  {caseComments.map(c => (
                    <div key={c.id} style={{
                      background: c.important ? `${c.color}08` : "var(--surface)",
                      border: c.important ? `1px solid ${c.color}40` : "1px solid var(--border)",
                      borderLeft: `3px solid ${c.color}`, borderRadius: 10, padding: "1rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", background: c.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 11, color: "#0f0f1e", flexShrink: 0
                        }}>{c.avatar}</div>
                        <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: c.color }}>{c.author}</span>
                        {c.important && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${c.color}20`, color: c.color, fontWeight: 700 }}>★ Important</span>}
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(c.timestamp)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
