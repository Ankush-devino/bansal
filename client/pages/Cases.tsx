import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import { useForensicStore, ForensicCase } from "@/hooks/useForensicStore";

// ── Helpers ────────────────────────────────────────────────────────────────────

function priorityColor(p: string) {
  switch (p?.toLowerCase()) {
    case "critical": return { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "#ef4444" };
    case "high":     return { bg: "rgba(233,69,96,0.12)", text: "#e94560", border: "#e94560" };
    case "medium":   return { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "#f59e0b" };
    default:         return { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "#10b981" };
  }
}

function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case "in progress": return { bg: "rgba(0,212,255,0.10)", text: "#00d4ff" };
    case "completed":   return { bg: "rgba(16,185,129,0.10)", text: "#10b981" };
    case "on hold":     return { bg: "rgba(239,68,68,0.10)", text: "#ef4444" };
    default:            return { bg: "rgba(245,158,11,0.10)", text: "#f59e0b" };
  }
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── New Case Modal ─────────────────────────────────────────────────────────────

interface NewCaseFormData {
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  crime_type: string;
  location: string;
  created_by: string;
}

const EMPTY_FORM: NewCaseFormData = {
  title: "", description: "", priority: "Medium",
  crime_type: "", location: "", created_by: "",
};

function NewCaseModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: NewCaseFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<NewCaseFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof NewCaseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Case title is required"); return; }
    setSaving(true); setError("");
    try { await onCreate(form); onClose(); }
    catch { setError("Failed to create case. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, width: "95%", position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: 42, height: 42, borderRadius: "10px",
              background: "linear-gradient(135deg,#00d4ff,#0098cc)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem"
            }}>📋</div>
            <div>
              <h2 className="modal-title">Create New Case</h2>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                New case will appear across all pages immediately
              </p>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div className="alert alert-error" style={{ padding: "0.75rem 1rem" }}>{error}</div>
          )}
          <div className="input-group">
            <label className="label">Case Title *</label>
            <input className="input" placeholder="e.g. Breaking and Entering – Sector 7" value={form.title} onChange={set("title")} />
          </div>
          <div className="input-group">
            <label className="label">Description</label>
            <textarea className="textarea" placeholder="Brief case description…" value={form.description} onChange={set("description")} style={{ minHeight: 80 }} />
          </div>
          <div className="form-row">
            <div className="input-group">
              <label className="label">Priority</label>
              <select className="select" value={form.priority} onChange={set("priority")}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">Crime Type</label>
              <select className="select" value={form.crime_type} onChange={set("crime_type")}>
                <option value="">Select type…</option>
                <option value="Burglary">Burglary</option>
                <option value="Fraud">Fraud</option>
                <option value="Identity Theft">Identity Theft</option>
                <option value="Cybercrime">Cybercrime</option>
                <option value="Homicide">Homicide</option>
                <option value="Assault">Assault</option>
                <option value="Drug Offense">Drug Offense</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="input-group">
              <label className="label">Location / City</label>
              <input className="input" placeholder="e.g. New Delhi" value={form.location} onChange={set("location")} />
            </div>
            <div className="input-group">
              <label className="label">Created By (Officer)</label>
              <input className="input" placeholder="e.g. Officer Smith" value={form.created_by} onChange={set("created_by")} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating…</> : "✓ Create Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Case Detail Panel ──────────────────────────────────────────────────────────

function CaseDetailPanel({ c, evidenceCount, assignedOfficer, onClose }: {
  c: ForensicCase; evidenceCount: number; assignedOfficer: string; onClose: () => void;
}) {
  const pc = priorityColor(c.priority);
  const sc = statusColor(c.status);
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
      zIndex: 900, display: "flex", flexDirection: "column", overflowY: "auto",
      boxShadow: "-8px 0 40px rgba(0,0,0,0.4)", animation: "slideIn 0.25s ease"
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Top bar */}
      <div style={{
        padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg,rgba(0,212,255,0.05),transparent)"
      }}>
        <div>
          <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "var(--text-sm)" }}>{c.case_id}</div>
          <h3 style={{ margin: "0.25rem 0 0", fontSize: "var(--text-lg)", fontWeight: 700 }}>{c.title}</h3>
        </div>
        <button className="modal-close" style={{ position: "static" }} onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
            {c.priority}
          </span>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>
            {c.status}
          </span>
        </div>

        {/* Description */}
        {c.description && (
          <div style={{ background: "var(--surface-light)", borderRadius: 10, padding: "1rem" }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.4rem", textTransform: "uppercase" }}>Description</div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{c.description}</p>
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { label: "Evidence Items", value: evidenceCount, color: "#00d4ff" },
            { label: "Assigned Officer", value: assignedOfficer || "Unassigned", color: assignedOfficer ? "#10b981" : "#f59e0b" },
            { label: "Created", value: fmtDate(c.created_date), color: "var(--text-secondary)" },
            { label: "Last Updated", value: fmtDate(c.updated_date), color: "var(--text-secondary)" },
          ].map(item => (
            <div key={item.label} style={{ background: "var(--surface-light)", borderRadius: 10, padding: "0.875rem" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.3rem" }}>{item.label}</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Created by */}
        {c.created_by && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", background: "var(--surface-light)", borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#00d4ff,#0098cc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>👤</div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Created By</div>
              <div style={{ fontWeight: 700, fontSize: "var(--text-sm)" }}>{c.created_by}</div>
            </div>
          </div>
        )}

        {/* Resolution time */}
        {c.resolution_time_days != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", background: "var(--surface-light)", borderRadius: 10 }}>
            <div style={{ fontSize: "1.5rem" }}>⏱</div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Resolution Time</div>
              <div style={{ fontWeight: 700, color: "#10b981" }}>{c.resolution_time_days} days</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Cases() {
  const { cases, evidence, assignments, loading, apiOnline, createCase } = useForensicStore();

  const [showNewCase, setShowNewCase] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ForensicCase | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = cases.filter(c => {
    if (filterStatus !== "All" && c.status !== filterStatus) return false;
    if (filterPriority !== "All" && c.priority !== filterPriority) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.case_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = useCallback(async (data: NewCaseFormData) => {
    await createCase({
      title: data.title,
      description: data.description,
      priority: data.priority,
      created_by: data.created_by || "Officer",
    });
  }, [createCase]);

  // Stats
  const total     = cases.length;
  const active    = cases.filter(c => c.status === "In Progress").length;
  const completed = cases.filter(c => c.status === "Completed").length;
  const pending   = cases.filter(c => c.status === "Pending").length;
  const totalEvidence = evidence.length;

  const getEvidenceCount = (caseId: string) => evidence.filter(e => e.case_id === caseId).length;
  const getAssignedOfficer = (c: ForensicCase) => {
    const a = assignments.find(a => a.case_id === c.case_id && a.status === "Active");
    return a ? a.officer_name : c.assigned_to || "";
  };

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
                background: "linear-gradient(135deg,#00d4ff,#0098cc)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"
              }}>📋</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "var(--text-3xl)" }}>Cases</h1>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  {total} total · synced with Evidence, Collaboration & Audit
                </p>
              </div>
              {/* API status dot */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: apiOnline ? "#10b981" : "#f59e0b", display: "inline-block", boxShadow: apiOnline ? "0 0 6px #10b981" : "0 0 6px #f59e0b" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{apiOnline ? "Live" : "Offline"}</span>
              </div>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setShowNewCase(true)}>+ New Case</button>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Total Cases",    value: total,        color: "#00d4ff", icon: "📋" },
              { label: "Active",         value: active,       color: "#00d4ff", icon: "🔍" },
              { label: "Completed",      value: completed,    color: "#10b981", icon: "✅" },
              { label: "Pending",        value: pending,      color: "#f59e0b", icon: "⏳" },
              { label: "Total Evidence", value: totalEvidence, color: "#c084fc", icon: "🔬" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
                padding: "1.25rem", position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", top: 12, right: 14, fontSize: "1.4rem", opacity: 0.3 }}>{s.icon}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>{s.label}</div>
                <div style={{ fontSize: "var(--text-3xl)", fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: "1 1 200px", minWidth: 180 }}
              placeholder="🔍  Search cases…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 150 }}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ minWidth: 150 }}>
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 1rem" }} />
              <p style={{ margin: 0 }}>Loading cases…</p>
            </div>
          )}

          {/* ── Cases Grid ── */}
          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "1.25rem" }}>
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📂</div>
                  <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>No cases found</p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "var(--text-sm)" }}>Try adjusting your filters or create a new case</p>
                </div>
              )}
              {filtered.map(c => {
                const pc = priorityColor(c.priority);
                const sc = statusColor(c.status);
                const evCount = getEvidenceCount(c.case_id);
                const officer = getAssignedOfficer(c);
                const isSelected = selectedCase?.case_id === c.case_id;

                return (
                  <div
                    key={c.case_id}
                    onClick={() => setSelectedCase(isSelected ? null : c)}
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${isSelected ? "#00d4ff" : "var(--border)"}`,
                      borderRadius: 16, padding: "1.25rem", cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? "0 0 0 2px rgba(0,212,255,0.2), var(--shadow-lg)" : "none",
                      transform: isSelected ? "translateY(-2px)" : "none",
                      position: "relative", overflow: "hidden",
                    }}
                  >
                    {/* Priority stripe */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: pc.text, borderRadius: "16px 16px 0 0" }} />

                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{c.case_id}</span>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>{c.priority}</span>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>{c.status}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: "0 0 0.5rem", fontSize: "var(--text-base)", fontWeight: 700 }}>{c.title}</h3>
                    {c.description && (
                      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingTop: "0.875rem", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Assigned To</div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginTop: "0.2rem", color: officer ? "#10b981" : "#f59e0b" }}>
                          {officer || "Unassigned"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Evidence</div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginTop: "0.2rem", color: "#00d4ff" }}>
                          {evCount} item{evCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Created</div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginTop: "0.2rem" }}>{fmtDate(c.created_date)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>By</div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginTop: "0.2rem" }}>{c.created_by || "—"}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-muted)", opacity: 0.7 }}>
                      {isSelected ? "Click to close details" : "Click to view details →"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Side Panel ── */}
      {selectedCase && (
        <>
          <div onClick={() => setSelectedCase(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 899 }} />
          <CaseDetailPanel
            c={selectedCase}
            evidenceCount={getEvidenceCount(selectedCase.case_id)}
            assignedOfficer={getAssignedOfficer(selectedCase)}
            onClose={() => setSelectedCase(null)}
          />
        </>
      )}

      {/* ── New Case Modal ── */}
      {showNewCase && (
        <NewCaseModal onClose={() => setShowNewCase(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
