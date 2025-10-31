import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface Officer {
  id: string;
  name: string;
  specialization: string;
  caseload: number;
  successRate: number;
  location: string;
  experience: number;
  matchScore: number;
}

interface AssignmentCase {
  id: string;
  caseId: string;
  title: string;
  complexity: string;
  evidenceType: string;
  priority: string;
  estimatedDays: number;
}

export default function Assignment() {
  const [selectedCase, setSelectedCase] = useState<AssignmentCase | null>(null);
  const [assignmentOfficers, setAssignmentOfficers] = useState<Officer[]>([
    {
      id: "1",
      name: "Officer Smith",
      specialization: "Fingerprint Specialist",
      caseload: 3,
      successRate: 94.5,
      location: "Downtown",
      experience: 8,
      matchScore: 98.5,
    },
    {
      id: "2",
      name: "Officer Johnson",
      specialization: "Digital Forensics",
      caseload: 2,
      successRate: 92.0,
      location: "Central Station",
      experience: 6,
      matchScore: 87.3,
    },
    {
      id: "3",
      name: "Officer Davis",
      specialization: "DNA Analysis",
      caseload: 4,
      successRate: 96.2,
      location: "Lab District",
      experience: 10,
      matchScore: 95.2,
    },
    {
      id: "4",
      name: "Officer Wilson",
      specialization: "Facial Recognition",
      caseload: 2,
      successRate: 89.8,
      location: "Downtown",
      experience: 5,
      matchScore: 82.1,
    },
    {
      id: "5",
      name: "Officer Brown",
      specialization: "Multi-Modal Biometrics",
      caseload: 3,
      successRate: 93.5,
      location: "Central Station",
      experience: 9,
      matchScore: 91.7,
    },
  ]);

  const [cases] = useState<AssignmentCase[]>([
    {
      id: "1",
      caseId: "CASE-2024-001",
      title: "Breaking and Entering",
      complexity: "Medium",
      evidenceType: "Fingerprint",
      priority: "High",
      estimatedDays: 8,
    },
    {
      id: "2",
      caseId: "CASE-2024-002",
      title: "Digital Fraud",
      complexity: "High",
      evidenceType: "Digital Evidence",
      priority: "Critical",
      estimatedDays: 15,
    },
    {
      id: "3",
      caseId: "CASE-2024-003",
      title: "Identity Theft",
      complexity: "Medium",
      evidenceType: "Biometric",
      priority: "High",
      estimatedDays: 10,
    },
  ]);

  const getComplexityColor = (complexity: string): string => {
    switch (complexity.toLowerCase()) {
      case "high":
        return "var(--danger)";
      case "medium":
        return "var(--warning)";
      default:
        return "var(--success)";
    }
  };

  const getOfficerStatusColor = (successRate: number): string => {
    if (successRate >= 95) return "var(--success)";
    if (successRate >= 90) return "var(--accent)";
    return "var(--warning)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />

        <main className="page-main">
          <div className="page-header">
            <div className="page-title">
              <h1>Smart Case Assignment</h1>
              <p style={{ margin: "var(--spacing-sm) 0 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                AI-powered case assignment considering specialization, workload, and success rates
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--spacing-xl)" }}>
            {/* Cases to Assign */}
            <div>
              <div className="card">
                <div style={{ marginBottom: "var(--spacing-lg)" }}>
                  <h3 style={{ margin: "0 0 var(--spacing-md) 0" }}>Cases Pending Assignment</h3>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    Select a case to view recommendations
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                  {cases.map((caseItem) => (
                    <button
                      key={caseItem.id}
                      onClick={() => setSelectedCase(caseItem)}
                      style={{
                        padding: "var(--spacing-lg)",
                        border: selectedCase?.id === caseItem.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: selectedCase?.id === caseItem.id ? "var(--surface-light)" : "transparent",
                        cursor: "pointer",
                        transition: "all var(--transition-base)",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ marginBottom: "var(--spacing-sm)" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "var(--spacing-xs)",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {caseItem.caseId}
                          </span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: `${getComplexityColor(caseItem.complexity)}40`,
                              color: getComplexityColor(caseItem.complexity),
                              border: `1px solid ${getComplexityColor(caseItem.complexity)}`,
                            }}
                          >
                            {caseItem.complexity}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                          {caseItem.title}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--spacing-lg)",
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>📋 {caseItem.evidenceType}</span>
                        <span>⏱️ ~{caseItem.estimatedDays}d</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Officer Recommendations */}
            <div>
              {selectedCase ? (
                <div className="card">
                  <div style={{ marginBottom: "var(--spacing-xl)" }}>
                    <h3 style={{ margin: "0 0 var(--spacing-md) 0" }}>
                      Recommended Officers for {selectedCase.caseId}
                    </h3>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                      Based on specialization, workload, and success rates
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
                    {assignmentOfficers
                      .sort((a, b) => b.matchScore - a.matchScore)
                      .map((officer) => (
                        <div
                          key={officer.id}
                          style={{
                            padding: "var(--spacing-lg)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-lg)",
                            backgroundColor: "var(--surface-light)",
                          }}
                        >
                          <div style={{ marginBottom: "var(--spacing-lg)" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "start",
                                marginBottom: "var(--spacing-sm)",
                              }}
                            >
                              <div>
                                <h4 style={{ margin: "0 0 var(--spacing-xs) 0", fontSize: "var(--text-base)" }}>
                                  {officer.name}
                                </h4>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                                  {officer.specialization}
                                </p>
                              </div>
                              <div
                                style={{
                                  textAlign: "right",
                                  fontSize: "var(--text-2xl)",
                                  fontWeight: 900,
                                  background: `linear-gradient(135deg, var(--accent), var(--secondary))`,
                                  WebkitBackgroundClip: "text",
                                  WebkitTextFillColor: "transparent",
                                  backgroundClip: "text",
                                }}
                              >
                                {officer.matchScore}%
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4, 1fr)",
                              gap: "var(--spacing-md)",
                              marginBottom: "var(--spacing-lg)",
                              paddingBottom: "var(--spacing-lg)",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "var(--spacing-xs)",
                                }}
                              >
                                Caseload
                              </div>
                              <div style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>
                                {officer.caseload}
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "var(--spacing-xs)",
                                }}
                              >
                                Success Rate
                              </div>
                              <div
                                style={{
                                  fontSize: "var(--text-lg)",
                                  fontWeight: 700,
                                  color: getOfficerStatusColor(officer.successRate),
                                }}
                              >
                                {officer.successRate}%
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "var(--spacing-xs)",
                                }}
                              >
                                Experience
                              </div>
                              <div style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>
                                {officer.experience}y
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "var(--spacing-xs)",
                                }}
                              >
                                Location
                              </div>
                              <div style={{ fontSize: "var(--text-sm)" }}>{officer.location}</div>
                            </div>
                          </div>

                          <button className="btn btn-primary" style={{ width: "100%" }}>
                            Assign Case
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)" }}>
                  <div style={{ fontSize: "var(--text-4xl)", marginBottom: "var(--spacing-lg)" }}>👈</div>
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                    Select a case to view recommended officers
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Factors */}
          <div
            style={{
              marginTop: "var(--spacing-2xl)",
              padding: "var(--spacing-xl)",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <h3 style={{ margin: "0 0 var(--spacing-lg) 0" }}>Assignment AI Factors</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-lg)" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "var(--spacing-sm)" }}>Specialization Match</div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Matches officer expertise with evidence type (35% weight)
                </p>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "var(--spacing-sm)" }}>Workload Balance</div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Distributes cases evenly across available officers (25% weight)
                </p>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "var(--spacing-sm)" }}>Success History</div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Considers past case resolution rates (25% weight)
                </p>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "var(--spacing-sm)" }}>Geographic Proximity</div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Factors in officer location relative to evidence location (15% weight)
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
