import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  blockHash: string;
  verified: boolean;
  signature: string;
}

export default function Audit() {
  const auditEntries: AuditEntry[] = [
    {
      id: "1",
      timestamp: "2024-01-20 14:32:15",
      action: "Evidence Uploaded",
      actor: "Officer Smith",
      target: "EV-2024-001",
      details: "Fingerprint evidence uploaded for CASE-2024-001",
      blockHash: "0x2a4c8b9f1e3d5c7a2f9e1b3a5d7c9e1f",
      verified: true,
      signature: "SIGNED",
    },
    {
      id: "2",
      timestamp: "2024-01-20 13:45:22",
      action: "Analysis Started",
      actor: "AI System",
      target: "EV-2024-001",
      details: "Automated fingerprint analysis initiated",
      blockHash: "0x5e7a9b1c3f2d4e6a8b0c1d3e5f7a9b1c",
      verified: true,
      signature: "SIGNED",
    },
    {
      id: "3",
      timestamp: "2024-01-20 12:20:08",
      action: "Case Created",
      actor: "Officer Johnson",
      target: "CASE-2024-001",
      details: "New case created - Breaking and Entering",
      blockHash: "0x1f3d5c7a9b1e2a4c6e8f0a2c4e6a8b0d",
      verified: true,
      signature: "SIGNED",
    },
    {
      id: "4",
      timestamp: "2024-01-20 11:15:42",
      action: "Evidence Accessed",
      actor: "Officer Davis",
      target: "EV-2024-002",
      details: "Evidence review for pattern analysis",
      blockHash: "0x8b0c1d3e5f7a9b1c2d3e4f5a6b7c8d9e",
      verified: true,
      signature: "SIGNED",
    },
    {
      id: "5",
      timestamp: "2024-01-20 10:05:33",
      action: "Chain of Custody Transfer",
      actor: "Officer Wilson",
      target: "EV-2024-003",
      details: "Evidence transferred from Lab A to Lab B",
      blockHash: "0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      verified: true,
      signature: "SIGNED",
    },
    {
      id: "6",
      timestamp: "2024-01-20 09:30:15",
      action: "Analysis Result Recorded",
      actor: "AI System",
      target: "CASE-2024-002",
      details: "Biometric fusion analysis result recorded on blockchain",
      blockHash: "0x0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
      verified: true,
      signature: "SIGNED",
    },
  ];

  const getActionColor = (action: string): string => {
    switch (action) {
      case "Evidence Uploaded":
        return "var(--accent)";
      case "Analysis Started":
      case "Analysis Result Recorded":
        return "var(--warning)";
      case "Case Created":
        return "var(--secondary)";
      case "Evidence Accessed":
      case "Chain of Custody Transfer":
        return "var(--success)";
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />

        <main className="page-main">
          <div className="page-header">
            <div className="page-title">
              <h1>Blockchain Audit Trail</h1>
              <p style={{ margin: "var(--spacing-sm) 0 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Tamper-proof record of all evidence access, transfers, and analysis
              </p>
            </div>
          </div>

          {/* Blockchain Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--spacing-lg)",
              marginBottom: "var(--spacing-xl)",
            }}
          >
            <div className="card">
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                TOTAL RECORDS
              </div>
              <div
                style={{
                  marginTop: "var(--spacing-md)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 900,
                  color: "var(--accent)",
                }}
              >
                {auditEntries.length}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                VERIFIED RECORDS
              </div>
              <div
                style={{
                  marginTop: "var(--spacing-md)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 900,
                  color: "var(--success)",
                }}
              >
                {auditEntries.filter((e) => e.verified).length}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                INTEGRITY STATUS
              </div>
              <div
                style={{
                  marginTop: "var(--spacing-md)",
                  fontSize: "var(--text-base)",
                  fontWeight: 900,
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-sm)",
                }}
              >
                ✓ All Records Valid
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 style={{ margin: "0 0 var(--spacing-xl) 0" }}>Activity Timeline</h3>

            <div className="timeline">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-date">{entry.timestamp}</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "var(--spacing-lg)",
                      alignItems: "start",
                      padding: "var(--spacing-lg)",
                      backgroundColor: "var(--surface-light)",
                      borderRadius: "var(--radius-lg)",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: "0 0 var(--spacing-sm) 0",
                          color: getActionColor(entry.action),
                          fontWeight: 700,
                        }}
                      >
                        {entry.action}
                      </h4>
                      <p style={{ margin: "0 0 var(--spacing-sm) 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                        {entry.details}
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "var(--spacing-lg)",
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                          marginTop: "var(--spacing-sm)",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>Actor:</span> {entry.actor}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600 }}>Target:</span> {entry.target}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "center", minWidth: "100px" }}>
                      {entry.verified && (
                        <div>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "rgba(16, 185, 129, 0.1)",
                              color: "var(--success)",
                              border: "1px solid var(--success)",
                              display: "inline-block",
                            }}
                          >
                            Verified
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-ghost"
                      style={{ padding: "var(--spacing-xs) var(--spacing-md)", fontSize: "var(--text-xs)" }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block Explorer */}
          <div className="card" style={{ marginTop: "var(--spacing-xl)" }}>
            <h3 style={{ margin: "0 0 var(--spacing-lg) 0" }}>Latest Block</h3>
            <div
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: "var(--text-xs)",
                backgroundColor: "var(--primary)",
                padding: "var(--spacing-lg)",
                borderRadius: "var(--radius-lg)",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                overflow: "auto",
                maxHeight: "200px",
              }}
            >
              <div>
                <span style={{ color: "var(--accent)" }}>Block Hash:</span> 0x0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Previous Hash:</span> 0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Timestamp:</span> 2024-01-20T09:30:15Z
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Transactions:</span> 6
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Miner:</span> ForensicAI Network
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Nonce:</span> 487293
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
