import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface Report {
  id: string;
  reportId: string;
  caseId: string;
  type: string;
  generatedDate: string;
  generatedBy: string;
  status: string;
  pages: number;
  aiGenerated: boolean;
  reviewed: boolean;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([
    {
      id: "1",
      reportId: "REP-2024-001",
      caseId: "CASE-2024-001",
      type: "Evidence Analysis",
      generatedDate: "2024-01-20",
      generatedBy: "Officer Smith",
      status: "Completed",
      pages: 12,
      aiGenerated: true,
      reviewed: true,
    },
    {
      id: "2",
      reportId: "REP-2024-002",
      caseId: "CASE-2024-002",
      type: "Biometric Fusion",
      generatedDate: "2024-01-19",
      generatedBy: "AI System",
      status: "Pending Review",
      pages: 8,
      aiGenerated: true,
      reviewed: false,
    },
    {
      id: "3",
      reportId: "REP-2024-003",
      caseId: "CASE-2024-003",
      type: "Digital Forensics",
      generatedDate: "2024-01-18",
      generatedBy: "Officer Davis",
      status: "In Progress",
      pages: 15,
      aiGenerated: true,
      reviewed: false,
    },
    {
      id: "4",
      reportId: "REP-2024-004",
      caseId: "CASE-2024-004",
      type: "Chain of Custody",
      generatedDate: "2024-01-17",
      generatedBy: "System",
      status: "Completed",
      pages: 5,
      aiGenerated: true,
      reviewed: true,
    },
  ]);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case "completed":
        return "status-completed";
      case "pending review":
        return "status-pending";
      case "in progress":
        return "status-in-progress";
      default:
        return "";
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
              <h1>Automated Reports</h1>
              <p style={{ margin: "var(--spacing-sm) 0 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                AI-generated forensic reports with expert review
              </p>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setShowGenerateForm(true)}>
                + Generate Report
              </button>
            </div>
          </div>

          {/* Reports Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--spacing-xl)" }}>
            {/* Reports List */}
            <div>
              <div className="card">
                <h3 style={{ margin: "0 0 var(--spacing-lg) 0", fontSize: "var(--text-lg)" }}>
                  Recent Reports
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      style={{
                        padding: "var(--spacing-lg)",
                        border: selectedReport?.id === report.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: selectedReport?.id === report.id ? "var(--surface-light)" : "transparent",
                        cursor: "pointer",
                        transition: "all var(--transition-base)",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "var(--spacing-sm)",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {report.reportId}
                        </span>
                        {report.aiGenerated && (
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              backgroundColor: "rgba(0, 212, 255, 0.1)",
                              color: "var(--accent)",
                              padding: "var(--spacing-xs) var(--spacing-sm)",
                              borderRadius: "var(--radius-full)",
                            }}
                          >
                            AI Generated
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                        {report.type}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>{report.pages} pages</span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: report.reviewed ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            color: report.reviewed ? "var(--success)" : "var(--warning)",
                            border: `1px solid ${report.reviewed ? "var(--success)" : "var(--warning)"}`,
                            padding: "var(--spacing-xs) var(--spacing-sm)",
                          }}
                        >
                          {report.reviewed ? "Reviewed" : "Not Reviewed"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Report Preview */}
            {selectedReport && (
              <div className="card">
                <div style={{ marginBottom: "var(--spacing-xl)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: "var(--spacing-lg)",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{selectedReport.reportId}</h3>
                      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                        {selectedReport.type}
                      </p>
                    </div>
                    <span className={`badge ${getStatusClass(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: "var(--spacing-lg)",
                      backgroundColor: "var(--surface-light)",
                      borderRadius: "var(--radius-lg)",
                      marginBottom: "var(--spacing-lg)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-lg)" }}>
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                          CASE ID
                        </div>
                        <div style={{ marginTop: "var(--spacing-xs)", fontWeight: 700 }}>
                          {selectedReport.caseId}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                          PAGES
                        </div>
                        <div style={{ marginTop: "var(--spacing-xs)", fontWeight: 700 }}>
                          {selectedReport.pages}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                          GENERATED
                        </div>
                        <div style={{ marginTop: "var(--spacing-xs)", fontSize: "var(--text-sm)" }}>
                          {selectedReport.generatedDate}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                          GENERATED BY
                        </div>
                        <div style={{ marginTop: "var(--spacing-xs)", fontSize: "var(--text-sm)" }}>
                          {selectedReport.generatedBy}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "var(--spacing-lg)",
                      border: "2px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      minHeight: "300px",
                      marginBottom: "var(--spacing-lg)",
                      backgroundColor: "var(--primary)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: "var(--text-xs)",
                        color: "var(--text-secondary)",
                        lineHeight: "1.6",
                      }}
                    >
                      <div style={{ marginBottom: "var(--spacing-lg)", fontWeight: 700 }}>
                        FORENSIC EVIDENCE ANALYSIS REPORT
                      </div>
                      <div style={{ marginBottom: "var(--spacing-lg)" }}>
                        <div style={{ color: "var(--accent)", marginBottom: "var(--spacing-sm)" }}>
                          Case: {selectedReport.caseId}
                        </div>
                        <div style={{ marginBottom: "var(--spacing-sm)" }}>
                          Report ID: {selectedReport.reportId}
                        </div>
                        <div style={{ marginBottom: "var(--spacing-sm)" }}>
                          Date: {selectedReport.generatedDate}
                        </div>
                      </div>
                      <div>
                        AI-generated preliminary forensic report for expert review.
                        <br />
                        This report contains initial analysis and recommendations
                        <br />
                        based on evidence examination and pattern matching.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>
                    Download Report
                  </button>
                  {!selectedReport.reviewed && (
                    <button className="btn btn-secondary" style={{ flex: 1 }}>
                      Review & Approve
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{ flex: 1 }}>
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generation Form Modal */}
          {showGenerateForm && (
            <div className="modal-backdrop" onClick={() => setShowGenerateForm(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button
                  className="modal-close"
                  onClick={() => setShowGenerateForm(false)}
                >
                  ✕
                </button>
                <div className="modal-header">
                  <h2 className="modal-title">Generate New Report</h2>
                </div>
                <div className="modal-body">
                  <div className="input-group">
                    <label className="label">Case</label>
                    <select className="select">
                      <option>CASE-2024-001</option>
                      <option>CASE-2024-002</option>
                      <option>CASE-2024-003</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="label">Report Type</label>
                    <select className="select">
                      <option>Evidence Analysis</option>
                      <option>Biometric Fusion</option>
                      <option>Digital Forensics</option>
                      <option>Chain of Custody</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="label">Include Sections</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                        <input type="checkbox" defaultChecked /> Evidence Summary
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                        <input type="checkbox" defaultChecked /> Analysis Results
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                        <input type="checkbox" /> Recommendations
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setShowGenerateForm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowGenerateForm(false)}>
                    Generate Report
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
