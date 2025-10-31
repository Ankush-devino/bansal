import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface Case {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: string;
  assignedTo: string;
  priority: string;
  createdDate: string;
  evidenceCount: number;
  resolutionTime: string;
}

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([
    {
      id: "1",
      caseId: "CASE-2024-001",
      title: "Breaking and Entering - Downtown",
      description: "Residential burglary with multiple evidence items",
      status: "In Progress",
      assignedTo: "Officer Smith",
      priority: "High",
      createdDate: "2024-01-15",
      evidenceCount: 12,
      resolutionTime: "8 days",
    },
    {
      id: "2",
      caseId: "CASE-2024-002",
      title: "Fraud Investigation - Financial Sector",
      description: "Digital fraud case requiring blockchain verification",
      status: "Pending",
      assignedTo: "Officer Johnson",
      priority: "Medium",
      createdDate: "2024-01-14",
      evidenceCount: 24,
      resolutionTime: "15 days",
    },
    {
      id: "3",
      caseId: "CASE-2024-003",
      title: "Digital Forensics - Mobile Device",
      description: "Mobile phone forensics with data recovery",
      status: "In Progress",
      assignedTo: "Officer Davis",
      priority: "Critical",
      createdDate: "2024-01-13",
      evidenceCount: 8,
      resolutionTime: "5 days",
    },
    {
      id: "4",
      caseId: "CASE-2024-004",
      title: "Biometric Match - Fingerprint",
      description: "Fingerprint identification and matching",
      status: "Completed",
      assignedTo: "Officer Wilson",
      priority: "High",
      createdDate: "2024-01-12",
      evidenceCount: 6,
      resolutionTime: "3 days",
    },
    {
      id: "5",
      caseId: "CASE-2024-005",
      title: "Evidence Analysis - Multi-Modal",
      description: "Complex case with multiple biometric modalities",
      status: "In Progress",
      assignedTo: "Officer Brown",
      priority: "Medium",
      createdDate: "2024-01-11",
      evidenceCount: 16,
      resolutionTime: "10 days",
    },
  ]);

  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredCases =
    filterStatus === "All" ? cases : cases.filter((c) => c.status === filterStatus);

  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case "completed":
        return "status-completed";
      case "in progress":
        return "status-in-progress";
      case "pending":
        return "status-pending";
      case "critical":
        return "status-critical";
      default:
        return "";
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "var(--danger)";
      case "high":
        return "var(--secondary)";
      case "medium":
        return "var(--warning)";
      default:
        return "var(--success)";
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
              <h1>Cases</h1>
            </div>
            <div className="page-actions">
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ minWidth: "150px" }}
              >
                <option>All</option>
                <option>Completed</option>
                <option>In Progress</option>
                <option>Pending</option>
              </select>
              <button className="btn btn-primary" onClick={() => setShowNewCaseForm(true)}>
                + New Case
              </button>
            </div>
          </div>

          {/* Cases Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "var(--spacing-lg)",
            }}
          >
            {filteredCases.map((caseItem) => (
              <div key={caseItem.id} className="card">
                <div style={{ marginBottom: "var(--spacing-lg)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: "var(--spacing-md)",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--accent)",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {caseItem.caseId}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${getPriorityColor(caseItem.priority)}40`,
                        color: getPriorityColor(caseItem.priority),
                        border: `1px solid ${getPriorityColor(caseItem.priority)}`,
                      }}
                    >
                      {caseItem.priority}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 var(--spacing-sm) 0", fontSize: "var(--text-lg)" }}>
                    {caseItem.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    {caseItem.description}
                  </p>
                </div>

                <div style={{ marginBottom: "var(--spacing-lg)", paddingBottom: "var(--spacing-lg)", borderBottom: "1px solid var(--border)" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "var(--spacing-md)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                        ASSIGNED TO
                      </div>
                      <div style={{ color: "var(--text-secondary)", marginTop: "var(--spacing-xs)" }}>
                        {caseItem.assignedTo}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                        EVIDENCE
                      </div>
                      <div style={{ color: "var(--text-secondary)", marginTop: "var(--spacing-xs)" }}>
                        {caseItem.evidenceCount} items
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`badge ${getStatusClass(caseItem.status)}`}>
                    {caseItem.status}
                  </span>
                  <button className="btn btn-ghost" style={{ padding: "var(--spacing-xs) var(--spacing-md)" }}>
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* New Case Form Modal */}
          {showNewCaseForm && (
            <div className="modal-backdrop" onClick={() => setShowNewCaseForm(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button
                  className="modal-close"
                  onClick={() => setShowNewCaseForm(false)}
                >
                  ✕
                </button>
                <div className="modal-header">
                  <h2 className="modal-title">Create New Case</h2>
                </div>
                <div className="modal-body">
                  <div className="input-group">
                    <label className="label">Case Title</label>
                    <input type="text" className="input" placeholder="Enter case title" />
                  </div>
                  <div className="input-group">
                    <label className="label">Description</label>
                    <textarea className="textarea" placeholder="Case description"></textarea>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label className="label">Assign To</label>
                      <select className="select">
                        <option>Officer Smith</option>
                        <option>Officer Johnson</option>
                        <option>Officer Davis</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="label">Priority</label>
                      <select className="select">
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setShowNewCaseForm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowNewCaseForm(false)}>
                    Create Case
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
