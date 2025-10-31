import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface Evidence {
  id: string;
  evidenceId: string;
  type: string;
  description: string;
  caseId: string;
  status: string;
  uploadedDate: string;
  uploadedBy: string;
  analysisStatus: string;
  confidence: number;
}

export default function Evidence() {
  const [evidence, setEvidence] = useState<Evidence[]>([
    {
      id: "1",
      evidenceId: "EV-2024-001",
      type: "Fingerprint",
      description: "Fingerprint from scene - thumb print",
      caseId: "CASE-2024-001",
      status: "Analyzed",
      uploadedDate: "2024-01-15",
      uploadedBy: "Officer Smith",
      analysisStatus: "Match Found",
      confidence: 99.2,
    },
    {
      id: "2",
      evidenceId: "EV-2024-002",
      type: "Facial Recognition",
      description: "CCTV footage - suspect face",
      caseId: "CASE-2024-002",
      status: "Pending Analysis",
      uploadedDate: "2024-01-14",
      uploadedBy: "Officer Johnson",
      analysisStatus: "Processing",
      confidence: 0,
    },
    {
      id: "3",
      evidenceId: "EV-2024-003",
      type: "DNA",
      description: "DNA sample - saliva",
      caseId: "CASE-2024-003",
      status: "Analyzing",
      uploadedDate: "2024-01-13",
      uploadedBy: "Officer Davis",
      analysisStatus: "In Progress",
      confidence: 45.5,
    },
    {
      id: "4",
      evidenceId: "EV-2024-004",
      type: "Digital Forensics",
      description: "Mobile device data dump",
      caseId: "CASE-2024-004",
      status: "Analyzed",
      uploadedDate: "2024-01-12",
      uploadedBy: "Officer Wilson",
      analysisStatus: "Complete",
      confidence: 98.7,
    },
    {
      id: "5",
      evidenceId: "EV-2024-005",
      type: "Iris Scan",
      description: "Iris biometric - suspect ID",
      caseId: "CASE-2024-005",
      status: "Analyzed",
      uploadedDate: "2024-01-11",
      uploadedBy: "Officer Brown",
      analysisStatus: "Match Found",
      confidence: 97.3,
    },
  ]);

  const [filterType, setFilterType] = useState("All");
  const [showUploadForm, setShowUploadForm] = useState(false);

  const filteredEvidence =
    filterType === "All" ? evidence : evidence.filter((e) => e.type === filterType);

  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case "analyzed":
        return "status-completed";
      case "analyzing":
      case "pending analysis":
        return "status-in-progress";
      default:
        return "";
    }
  };

  const getAnalysisStatusClass = (status: string): string => {
    if (status === "Match Found") return "status-completed";
    if (status === "In Progress" || status === "Processing") return "status-in-progress";
    return "";
  };

  const evidenceTypes = ["All", "Fingerprint", "Facial Recognition", "DNA", "Digital Forensics", "Iris Scan"];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />

        <main className="page-main">
          <div className="page-header">
            <div className="page-title">
              <h1>Evidence Management</h1>
            </div>
            <div className="page-actions">
              <select
                className="input"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ minWidth: "150px" }}
              >
                {evidenceTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => setShowUploadForm(true)}>
                + Upload Evidence
              </button>
            </div>
          </div>

          {/* Evidence Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "var(--spacing-lg)",
            }}
          >
            {filteredEvidence.map((evid) => (
              <div key={evid.id} className="evidence-card">
                <div className="evidence-header">
                  <div className="evidence-id">{evid.evidenceId}</div>
                  <span className="evidence-type-badge">{evid.type}</span>
                </div>

                <p style={{ margin: "0 0 var(--spacing-lg) 0", color: "var(--text-secondary)" }}>
                  {evid.description}
                </p>

                <div className="evidence-details">
                  <div className="detail-row">
                    <div className="detail-label">Case ID</div>
                    <div className="detail-value">{evid.caseId}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Uploaded By</div>
                    <div className="detail-value">{evid.uploadedBy}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Date</div>
                    <div className="detail-value">{evid.uploadedDate}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Status</div>
                    <span className={`badge ${getStatusClass(evid.status)}`}>
                      {evid.status}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    margin: "var(--spacing-lg) 0 0 0",
                    paddingTop: "var(--spacing-lg)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div style={{ marginBottom: "var(--spacing-md)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "var(--spacing-sm)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>Analysis Result</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: evid.analysisStatus === "Match Found" ? "var(--success)" : "var(--accent)",
                        }}
                      >
                        {evid.analysisStatus}
                      </span>
                    </div>
                    {evid.confidence > 0 && (
                      <div style={{ position: "relative", height: "8px", backgroundColor: "var(--border)", borderRadius: "var(--radius-full)" }}>
                        <div
                          style={{
                            position: "absolute",
                            height: "100%",
                            backgroundColor: evid.confidence > 90 ? "var(--success)" : "var(--accent)",
                            borderRadius: "var(--radius-full)",
                            width: `${evid.confidence}%`,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    )}
                    {evid.confidence > 0 && (
                      <div style={{ marginTop: "var(--spacing-xs)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {evid.confidence.toFixed(1)}% confidence
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: "var(--spacing-lg)", display: "flex", gap: "var(--spacing-sm)" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }}>
                    View Details
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }}>
                    Blockchain
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Form Modal */}
          {showUploadForm && (
            <div className="modal-backdrop" onClick={() => setShowUploadForm(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button
                  className="modal-close"
                  onClick={() => setShowUploadForm(false)}
                >
                  ✕
                </button>
                <div className="modal-header">
                  <h2 className="modal-title">Upload Evidence</h2>
                </div>
                <div className="modal-body">
                  <div className="input-group">
                    <label className="label">Evidence Type</label>
                    <select className="select">
                      <option>Fingerprint</option>
                      <option>Facial Recognition</option>
                      <option>DNA</option>
                      <option>Digital Forensics</option>
                      <option>Iris Scan</option>
                      <option>Voice Analysis</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="label">Case</label>
                    <select className="select">
                      <option>CASE-2024-001</option>
                      <option>CASE-2024-002</option>
                      <option>CASE-2024-003</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="label">Description</label>
                    <textarea className="textarea" placeholder="Evidence description"></textarea>
                  </div>
                  <div className="input-group">
                    <label className="label">Upload File</label>
                    <input type="file" className="input" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setShowUploadForm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowUploadForm(false)}>
                    Upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
