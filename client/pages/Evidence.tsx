import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import { useForensicStore, ForensicEvidence } from "@/hooks/useForensicStore";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  "Fingerprint": "👆", "Facial Recognition": "😐", "DNA": "🧬",
  "Digital Forensics": "💻", "Iris Scan": "👁", "Voice Analysis": "🎙",
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Fingerprint":       { bg: "rgba(0,212,255,0.12)",   text: "#00d4ff",  border: "#00d4ff" },
  "Facial Recognition":{ bg: "rgba(192,132,252,0.12)", text: "#c084fc",  border: "#c084fc" },
  "DNA":               { bg: "rgba(16,185,129,0.12)",  text: "#10b981",  border: "#10b981" },
  "Digital Forensics": { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24",  border: "#fbbf24" },
  "Iris Scan":         { bg: "rgba(233,69,96,0.12)",   text: "#e94560",  border: "#e94560" },
  "Voice Analysis":    { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b",  border: "#f59e0b" },
};

function statusBadge(status: string) {
  switch (status) {
    case "Analyzed":        return { bg: "rgba(16,185,129,0.12)",  text: "#10b981" };
    case "Analyzing":       return { bg: "rgba(0,212,255,0.12)",   text: "#00d4ff" };
    case "Pending Analysis":return { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b" };
    default:                return { bg: "rgba(128,128,154,0.12)", text: "#80809a" };
  }
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Upload Evidence Modal ──────────────────────────────────────────────────────

type EvidenceType = ForensicEvidence["type"];

interface UploadFormData {
  case_id: string;
  type: EvidenceType;
  description: string;
  uploaded_by: string;
}

function UploadModal({ cases, onClose, onUpload }: {
  cases: { case_id: string; title: string }[];
  onClose: () => void;
  onUpload: (data: UploadFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<UploadFormData>({
    case_id: cases[0]?.case_id ?? "",
    type: "Fingerprint",
    description: "",
    uploaded_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k: keyof UploadFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value as any }));

  const handleSubmit = async () => {
    if (!form.case_id) { setError("Please select a case"); return; }
    setSaving(true); setError("");
    try {
      await onUpload(form);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch { setError("Upload failed. Please try again."); }
    finally { setSaving(false); }
  };

  const tc = TYPE_COLORS[form.type] || TYPE_COLORS["Fingerprint"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580, width: "95%", position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: `linear-gradient(135deg,${tc.text},${tc.border}80)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem"
            }}>
              {TYPE_ICONS[form.type] || "🔬"}
            </div>
            <div>
              <h2 className="modal-title">Upload Evidence</h2>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                Evidence will auto-update Cases, Collaboration & Audit Trail
              </p>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && <div className="alert alert-error" style={{ padding: "0.75rem 1rem" }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ padding: "0.75rem 1rem" }}>✓ Evidence uploaded successfully!</div>}

          <div className="input-group">
            <label className="label">Case *</label>
            <select className="select" value={form.case_id} onChange={set("case_id")}>
              {cases.length === 0 && <option value="">No cases available</option>}
              {cases.map(c => (
                <option key={c.case_id} value={c.case_id}>{c.case_id} — {c.title}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="label">Evidence Type *</label>
            <select className="select" value={form.type} onChange={set("type")}>
              {(["Fingerprint","Facial Recognition","DNA","Digital Forensics","Iris Scan","Voice Analysis"] as EvidenceType[]).map(t => (
                <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
              ))}
            </select>
          </div>

          {/* Preview badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "var(--surface-light)", borderRadius: 10 }}>
            <span style={{ fontSize: "1.5rem" }}>{TYPE_ICONS[form.type]}</span>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
              {form.type}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: "auto" }}>Status: Pending Analysis</span>
          </div>

          <div className="input-group">
            <label className="label">Description</label>
            <textarea className="textarea" placeholder="Describe the evidence item, collection method, notes…"
              value={form.description} onChange={set("description")} style={{ minHeight: 90 }} />
          </div>

          <div className="input-group">
            <label className="label">Uploaded By (Officer)</label>
            <input className="input" placeholder="e.g. Officer Smith" value={form.uploaded_by} onChange={set("uploaded_by")} />
          </div>

          {/* File upload visual */}
          <div style={{
            border: "2px dashed var(--border)", borderRadius: 12, padding: "1.5rem",
            textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            background: "var(--surface-light)"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
            <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
              Drag & drop evidence file here
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Supports images, documents, forensic data files
            </div>
            <input type="file" style={{ display: "none" }} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || success}>
            {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Uploading…</> : "↑ Upload Evidence"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Evidence Detail Drawer ─────────────────────────────────────────────────────

function EvidenceDrawer({ e, caseName, onClose }: {
  e: ForensicEvidence; caseName: string; onClose: () => void;
}) {
  const tc = TYPE_COLORS[e.type] || TYPE_COLORS["Fingerprint"];
  const sc = statusBadge(e.status);
  const analysisSc =
    e.analysis_status === "Match Found" ? "#10b981" :
    e.analysis_status === "Processing" || e.analysis_status === "In Progress" ? "#00d4ff" :
    e.analysis_status === "Complete" ? "#10b981" : "var(--text-muted)";

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
      zIndex: 900, display: "flex", flexDirection: "column", overflowY: "auto",
      boxShadow: "-8px 0 40px rgba(0,0,0,0.4)", animation: "slideIn 0.25s ease"
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{
        padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)",
        background: `linear-gradient(135deg,${tc.bg},transparent)`,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "2rem" }}>{TYPE_ICONS[e.type] || "🔬"}</div>
          <div>
            <div style={{ fontFamily: "var(--font-family-mono)", fontSize: 11, color: tc.text, fontWeight: 700 }}>{e.evidence_id}</div>
            <h3 style={{ margin: "0.2rem 0 0", fontSize: "var(--text-base)", fontWeight: 700 }}>{e.type}</h3>
          </div>
        </div>
        <button className="modal-close" style={{ position: "static" }} onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{e.type}</span>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{e.status}</span>
        </div>

        {/* Description */}
        {e.description && (
          <div style={{ background: "var(--surface-light)", borderRadius: 10, padding: "1rem" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.4rem", textTransform: "uppercase" }}>Description</div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{e.description}</p>
          </div>
        )}

        {/* Case link */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", background: "rgba(0,212,255,0.06)", borderRadius: 10, border: "1px solid rgba(0,212,255,0.15)" }}>
          <span style={{ fontSize: "1.2rem" }}>📋</span>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Linked Case</div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "#00d4ff" }}>{e.case_id} — {caseName}</div>
          </div>
        </div>

        {/* Grid meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { label: "Uploaded By",   value: e.uploaded_by, color: "var(--text-secondary)" },
            { label: "Upload Date",   value: fmtDate(e.uploaded_date), color: "var(--text-secondary)" },
          ].map(item => (
            <div key={item.label} style={{ background: "var(--surface-light)", borderRadius: 10, padding: "0.875rem" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.3rem" }}>{item.label}</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Analysis */}
        <div style={{ background: "var(--surface-light)", borderRadius: 12, padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Analysis Result</div>
            <span style={{ fontWeight: 700, color: analysisSc, fontSize: "var(--text-sm)" }}>{e.analysis_status || "Pending"}</span>
          </div>
          {e.confidence_score > 0 && (
            <>
              <div style={{ position: "relative", height: 10, background: "var(--border)", borderRadius: 999, overflow: "hidden", marginBottom: "0.4rem" }}>
                <div style={{
                  position: "absolute", height: "100%", borderRadius: 999,
                  background: e.confidence_score > 90 ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#00d4ff,#0098cc)",
                  width: `${e.confidence_score}%`, transition: "width 1s ease"
                }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{e.confidence_score.toFixed(1)}% confidence</div>
            </>
          )}
        </div>

        {/* Blockchain */}
        {e.blockchain_hash && (
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>⛓</span>
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>Blockchain Verified</span>
              <span className="badge badge-success" style={{ marginLeft: "auto", fontSize: 10 }}>✓ Valid</span>
            </div>
            <code style={{ fontFamily: "var(--font-family-mono)", fontSize: 10, color: "var(--text-muted)", wordBreak: "break-all" }}>
              {e.blockchain_hash}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Evidence() {
  const { evidence, cases, loading, apiOnline, uploadEvidence } = useForensicStore();

  const [showUpload, setShowUpload] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<ForensicEvidence | null>(null);
  const [filterType, setFilterType] = useState("All");
  const [filterCase, setFilterCase] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = evidence.filter(e => {
    if (filterType !== "All" && e.type !== filterType) return false;
    if (filterCase !== "All" && e.case_id !== filterCase) return false;
    if (filterStatus !== "All" && e.status !== filterStatus) return false;
    if (search && !e.evidence_id.toLowerCase().includes(search.toLowerCase()) &&
        !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpload = useCallback(async (data: {
    case_id: string; type: ForensicEvidence["type"]; description: string; uploaded_by: string;
  }) => {
    await uploadEvidence(data);
  }, [uploadEvidence]);

  const getCaseTitle = (caseId: string) =>
    cases.find(c => c.case_id === caseId)?.title ?? caseId;

  // Stats
  const analyzed = evidence.filter(e => e.status === "Analyzed").length;
  const pending  = evidence.filter(e => e.status === "Pending Analysis").length;
  const analyzing = evidence.filter(e => e.status === "Analyzing").length;
  const avgConfidence = evidence.filter(e => e.confidence_score > 0).length > 0
    ? (evidence.filter(e => e.confidence_score > 0).reduce((s, e) => s + e.confidence_score, 0) /
       evidence.filter(e => e.confidence_score > 0).length).toFixed(1)
    : "—";

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
                background: "linear-gradient(135deg,#c084fc,#9333ea)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"
              }}>🔬</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "var(--text-3xl)" }}>Evidence</h1>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  {evidence.length} items · linked to {cases.length} cases
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: apiOnline ? "#10b981" : "#f59e0b", display: "inline-block", boxShadow: apiOnline ? "0 0 6px #10b981" : "0 0 6px #f59e0b" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{apiOnline ? "Live DB" : "Offline Mode"}</span>
              </div>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>↑ Upload Evidence</button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Total Items",   value: evidence.length, color: "#c084fc", icon: "🔬" },
              { label: "Analyzed",      value: analyzed,         color: "#10b981", icon: "✅" },
              { label: "Analyzing",     value: analyzing,        color: "#00d4ff", icon: "⚙️" },
              { label: "Pending",       value: pending,          color: "#f59e0b", icon: "⏳" },
              { label: "Avg Confidence",value: `${avgConfidence}%`, color: "#fbbf24", icon: "📊" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
                padding: "1.25rem", position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", top: 12, right: 14, fontSize: "1.4rem", opacity: 0.3 }}>{s.icon}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>{s.label}</div>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <input className="input" style={{ flex: "1 1 180px" }} placeholder="🔍  Search evidence…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ minWidth: 180 }}>
              <option value="All">All Types</option>
              {["Fingerprint","Facial Recognition","DNA","Digital Forensics","Iris Scan","Voice Analysis"].map(t => (
                <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
              ))}
            </select>
            <select className="select" value={filterCase} onChange={e => setFilterCase(e.target.value)} style={{ minWidth: 180 }}>
              <option value="All">All Cases</option>
              {cases.map(c => <option key={c.case_id} value={c.case_id}>{c.case_id}</option>)}
            </select>
            <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 160 }}>
              <option value="All">All Statuses</option>
              <option value="Analyzed">Analyzed</option>
              <option value="Analyzing">Analyzing</option>
              <option value="Pending Analysis">Pending Analysis</option>
            </select>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 1rem" }} />
              <p style={{ margin: 0 }}>Loading evidence…</p>
            </div>
          )}

          {/* ── Evidence Grid ── */}
          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: "1.25rem" }}>
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔬</div>
                  <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>No evidence found</p>
                  <p style={{ margin: "0.5rem 0 1.5rem", fontSize: "var(--text-sm)" }}>Try adjusting filters or upload new evidence</p>
                  <button className="btn btn-primary" onClick={() => setShowUpload(true)}>↑ Upload Evidence</button>
                </div>
              )}
              {filtered.map(e => {
                const tc = TYPE_COLORS[e.type] || TYPE_COLORS["Fingerprint"];
                const sc = statusBadge(e.status);
                const isSelected = selectedEvidence?.evidence_id === e.evidence_id;

                return (
                  <div
                    key={e.evidence_id}
                    onClick={() => setSelectedEvidence(isSelected ? null : e)}
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${isSelected ? tc.border : "var(--border)"}`,
                      borderRadius: 16, padding: "1.25rem", cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? `0 0 0 2px ${tc.bg}, var(--shadow-lg)` : "none",
                      transform: isSelected ? "translateY(-2px)" : "none",
                      position: "relative", overflow: "hidden"
                    }}
                  >
                    {/* Type stripe */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: tc.text, borderRadius: "16px 16px 0 0" }} />

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>{TYPE_ICONS[e.type] || "🔬"}</span>
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: 11, color: tc.text, fontWeight: 700 }}>{e.evidence_id}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{e.type}</span>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>{e.status}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {e.description && (
                      <p style={{ margin: "0 0 0.875rem", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {e.description}
                      </p>
                    )}

                    {/* Confidence bar */}
                    {e.confidence_score > 0 && (
                      <div style={{ marginBottom: "0.875rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>CONFIDENCE</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: e.confidence_score > 90 ? "#10b981" : tc.text }}>{e.confidence_score.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${e.confidence_score}%`, borderRadius: 999,
                            background: e.confidence_score > 90 ? "linear-gradient(90deg,#10b981,#059669)" : `linear-gradient(90deg,${tc.text},${tc.border}80)`,
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Footer meta */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", paddingTop: "0.875rem", borderTop: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Case</div>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#00d4ff", marginTop: "0.15rem" }}>{e.case_id}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>By</div>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginTop: "0.15rem" }}>{e.uploaded_by || "—"}</div>
                      </div>
                    </div>

                    {/* Blockchain indicator */}
                    {e.blockchain_hash && (
                      <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: 10, color: "#10b981", fontWeight: 600 }}>
                        <span>⛓</span> Blockchain Verified
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Side drawer */}
      {selectedEvidence && (
        <>
          <div onClick={() => setSelectedEvidence(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 899 }} />
          <EvidenceDrawer
            e={selectedEvidence}
            caseName={getCaseTitle(selectedEvidence.case_id)}
            onClose={() => setSelectedEvidence(null)}
          />
        </>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          cases={cases}
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}
