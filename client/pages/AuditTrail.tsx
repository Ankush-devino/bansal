import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import { useForensicStore } from "@/hooks/useForensicStore";

// ── Types & Helpers ────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  "Case Created":              "📋",
  "Case Assigned":             "👤",
  "Evidence Uploaded":         "🔬",
  "Evidence Analyzed":         "🧬",
  "Biometric Analysis":        "👁",
  "Biometric Verified":        "✅",
  "Chain of Custody Transfer": "🔗",
  "Smart Contract Executed":   "⚙️",
  "Report Generated":          "📄",
  "Report Reviewed":           "📝",
};

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Case Created":              { bg: "rgba(0,212,255,0.1)",   text: "#00d4ff",  border: "#00d4ff" },
  "Case Assigned":             { bg: "rgba(192,132,252,0.1)", text: "#c084fc",  border: "#c084fc" },
  "Evidence Uploaded":         { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b",  border: "#f59e0b" },
  "Evidence Analyzed":         { bg: "rgba(16,185,129,0.1)",  text: "#10b981",  border: "#10b981" },
  "Biometric Analysis":        { bg: "rgba(233,69,96,0.1)",   text: "#e94560",  border: "#e94560" },
  "Biometric Verified":        { bg: "rgba(16,185,129,0.1)",  text: "#10b981",  border: "#10b981" },
  "Chain of Custody Transfer": { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24",  border: "#fbbf24" },
  "Report Generated":          { bg: "rgba(0,212,255,0.1)",   text: "#00d4ff",  border: "#00d4ff" },
};

function getActionStyle(action: string) {
  return ACTION_COLORS[action] || { bg: "rgba(128,128,154,0.1)", text: "#80809a", border: "#80809a" };
}

function fmtDateTime(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AuditTrail() {
  const { auditLogs, evidence, cases, assignments, loading, apiOnline } = useForensicStore();

  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [filterVerified, setFilterVerified] = useState("All");
  const [filterTarget, setFilterTarget] = useState("All");
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Unique values for filters
  const uniqueActions = useMemo(() => {
    const s = new Set(auditLogs.map(e => e.action));
    return Array.from(s).sort();
  }, [auditLogs]);

  const uniqueTargets = useMemo(() => {
    const s = new Set(auditLogs.map(e => e.target_type).filter(Boolean));
    return Array.from(s).sort();
  }, [auditLogs]);

  const filtered = useMemo(() => {
    return auditLogs.filter(e => {
      if (filterAction !== "All" && e.action !== filterAction) return false;
      if (filterVerified === "Verified" && !e.verified) return false;
      if (filterVerified === "Unverified" && e.verified) return false;
      if (filterTarget !== "All" && e.target_type !== filterTarget) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.action.toLowerCase().includes(q) &&
            !e.actor?.toLowerCase().includes(q) &&
            !e.details?.toLowerCase().includes(q) &&
            !e.target_id?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [auditLogs, filterAction, filterVerified, filterTarget, search]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  // Stats
  const totalLogs   = auditLogs.length;
  const verified    = auditLogs.filter(e => e.verified).length;
  const blockchained = auditLogs.filter(e => e.block_hash).length;
  const verifiedPct = totalLogs > 0 ? Math.round((verified / totalLogs) * 100) : 100;

  // Recent activity (last 24h)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const recent24h = auditLogs.filter(e => e.timestamp > yesterday).length;

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
                background: "linear-gradient(135deg,#fbbf24,#d97706)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"
              }}>⛓</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "var(--text-3xl)" }}>Audit Trail</h1>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  Blockchain-verified chain of custody · {totalLogs} records
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: apiOnline ? "#10b981" : "#f59e0b", display: "inline-block", boxShadow: apiOnline ? "0 0 6px #10b981" : "0 0 6px #f59e0b" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{apiOnline ? "Live DB" : "Offline Mode"}</span>
              </div>
            </div>
            <div className="page-actions">
              <button
                className={`btn ${view === "timeline" ? "btn-secondary" : "btn-ghost"}`}
                onClick={() => setView("timeline")}>
                ≡ Timeline
              </button>
              <button
                className={`btn ${view === "table" ? "btn-secondary" : "btn-ghost"}`}
                onClick={() => setView("table")}>
                ⊞ Table
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Total Records",      value: totalLogs,       icon: "📋", color: "#fbbf24" },
              { label: "Blockchain Verified",value: verified,         icon: "⛓", color: "#10b981" },
              { label: "On-Chain Records",   value: blockchained,     icon: "🔗", color: "#00d4ff" },
              { label: "Last 24h Activity",  value: recent24h,        icon: "⚡", color: "#c084fc" },
              { label: "Integrity Score",    value: `${verifiedPct}%`,icon: "🛡", color: verifiedPct >= 95 ? "#10b981" : "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
                padding: "1.25rem", position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", top: 12, right: 14, fontSize: "1.4rem", opacity: 0.25 }}>{s.icon}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>{s.label}</div>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Integrity Banner ── */}
          <div style={{
            padding: "0.875rem 1.25rem", borderRadius: 12, marginBottom: "1.5rem",
            background: verifiedPct >= 95 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${verifiedPct >= 95 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
            display: "flex", alignItems: "center", gap: "0.75rem"
          }}>
            <span style={{ fontSize: "1.3rem" }}>{verifiedPct >= 95 ? "🛡" : "⚠️"}</span>
            <div>
              <div style={{ fontWeight: 700, color: verifiedPct >= 95 ? "#10b981" : "#f59e0b", fontSize: "var(--text-sm)" }}>
                {verifiedPct >= 95 ? "All Records Valid – Chain of Custody Intact" : "Warning: Some records unverified"}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                {verified} of {totalLogs} records verified on blockchain · {cases.length} cases · {evidence.length} evidence items tracked
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "var(--text-lg)", fontWeight: 900, color: verifiedPct >= 95 ? "#10b981" : "#f59e0b" }}>
              {verifiedPct}%
            </div>
          </div>

          {/* ── Filters ── */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <input className="input" style={{ flex: "1 1 200px" }} placeholder="🔍  Search logs…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="select" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} style={{ minWidth: 180 }}>
              <option value="All">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{ACTION_ICONS[a] || "·"} {a}</option>)}
            </select>
            <select className="select" value={filterTarget} onChange={e => { setFilterTarget(e.target.value); setPage(1); }} style={{ minWidth: 150 }}>
              <option value="All">All Targets</option>
              {uniqueTargets.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="select" value={filterVerified} onChange={e => { setFilterVerified(e.target.value); setPage(1); }} style={{ minWidth: 150 }}>
              <option value="All">All Records</option>
              <option value="Verified">✅ Verified Only</option>
              <option value="Unverified">⚠️ Unverified</option>
            </select>
          </div>

          {/* Result count */}
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Showing {paginated.length} of {filtered.length} records
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 1rem" }} />
              <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading audit trail…</p>
            </div>
          )}

          {/* ══════════ TIMELINE VIEW ══════════ */}
          {!loading && view === "timeline" && (
            <div>
              {paginated.length === 0 && (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: "3rem" }}>⛓</span>
                  <p style={{ margin: "1rem 0 0", fontWeight: 600 }}>No audit records match your filters</p>
                </div>
              )}

              <div style={{ position: "relative", paddingLeft: "2.5rem" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute", left: 11, top: 0, bottom: 0, width: 2,
                  background: "linear-gradient(180deg,#fbbf24 0%,rgba(251,191,36,0.2) 100%)",
                }} />

                {paginated.map((entry, i) => {
                  const ac = getActionStyle(entry.action);
                  return (
                    <div key={entry.entry_id || i} style={{ position: "relative", marginBottom: "1.25rem" }}>
                      {/* Dot */}
                      <div style={{
                        position: "absolute", left: -26, top: 14,
                        width: 12, height: 12, borderRadius: "50%",
                        background: ac.text, border: "2px solid var(--background)",
                        boxShadow: `0 0 6px ${ac.text}80`,
                      }} />

                      <div style={{
                        background: "var(--surface)", border: `1px solid var(--border)`,
                        borderRadius: 12, padding: "1rem 1.25rem",
                        transition: "all 0.2s",
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                          {/* Left */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1 }}>
                            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{ACTION_ICONS[entry.action] || "·"}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                                <span style={{
                                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: ac.bg, color: ac.text, border: `1px solid ${ac.border}40`
                                }}>{entry.action}</span>
                                {entry.verified && (
                                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>⛓ Verified</span>
                                )}
                                {entry.target_type && (
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>→ {entry.target_type}</span>
                                )}
                              </div>

                              {entry.details && (
                                <p style={{ margin: "0 0 0.4rem", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                                  {entry.details}
                                </p>
                              )}

                              <div style={{ display: "flex", gap: "1rem", fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                                {entry.actor && <span>👤 {entry.actor}</span>}
                                {entry.target_id && <span style={{ fontFamily: "var(--font-family-mono)", color: ac.text }}>#{entry.target_id}</span>}
                              </div>

                              {/* Blockchain hash */}
                              {entry.block_hash && (
                                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                                    <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>⛓ BLOCK HASH</span>
                                  </div>
                                  <code style={{ fontFamily: "var(--font-family-mono)", fontSize: 10, color: "var(--text-muted)", wordBreak: "break-all" }}>
                                    {entry.block_hash}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: timestamp */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{timeAgo(entry.timestamp)}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: "0.15rem" }}>{fmtDateTime(entry.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)}>
                    Load More ({filtered.length - paginated.length} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════ TABLE VIEW ══════════ */}
          {!loading && view === "table" && (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Verified</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No records found</td></tr>
                  )}
                  {paginated.map((entry, i) => {
                    const ac = getActionStyle(entry.action);
                    return (
                      <tr key={entry.entry_id || i}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>{ACTION_ICONS[entry.action] || "·"}</span>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ac.bg, color: ac.text }}>
                              {entry.action}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{entry.actor || "—"}</td>
                        <td>
                          {entry.target_type && (
                            <div>
                              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700 }}>{entry.target_type}</div>
                              <code style={{ fontFamily: "var(--font-family-mono)", fontSize: 11, color: ac.text }}>{entry.target_id}</code>
                            </div>
                          )}
                        </td>
                        <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.details || "—"}</td>
                        <td>
                          {entry.verified
                            ? <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13 }}>⛓ Verified</span>
                            : <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>⚠ Pending</span>}
                        </td>
                        <td style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {timeAgo(entry.timestamp)}
                          <div>{fmtDateTime(entry.timestamp)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)}>
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
