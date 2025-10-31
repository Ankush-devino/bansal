import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface BiometricModality {
  id: string;
  name: string;
  icon: string;
  status: string;
  confidence: number;
  sampleQuality: number;
  matchCount: number;
  processingTime: string;
}

interface BiometricResult {
  id: string;
  caseId: string;
  suspectId: string;
  name: string;
  matchScore: number;
  modalities: BiometricModality[];
  consensusResult: string;
  verified: boolean;
}

export default function Biometric() {
  const [results, setResults] = useState<BiometricResult[]>([
    {
      id: "1",
      caseId: "CASE-2024-001",
      suspectId: "SUSP-001",
      name: "John Smith",
      matchScore: 99.2,
      consensusResult: "Match Confirmed",
      verified: true,
      modalities: [
        {
          id: "1",
          name: "Fingerprint",
          icon: "👆",
          status: "Matched",
          confidence: 99.7,
          sampleQuality: 98,
          matchCount: 12,
          processingTime: "2.3s",
        },
        {
          id: "2",
          name: "Facial Recognition",
          icon: "👤",
          status: "Matched",
          confidence: 98.9,
          sampleQuality: 95,
          matchCount: 8,
          processingTime: "3.1s",
        },
        {
          id: "3",
          name: "Iris Scan",
          icon: "👁️",
          status: "Matched",
          confidence: 99.4,
          sampleQuality: 97,
          matchCount: 5,
          processingTime: "2.8s",
        },
      ],
    },
    {
      id: "2",
      caseId: "CASE-2024-002",
      suspectId: "SUSP-002",
      name: "Jane Doe",
      matchScore: 87.5,
      consensusResult: "Partial Match",
      verified: false,
      modalities: [
        {
          id: "1",
          name: "Fingerprint",
          icon: "👆",
          status: "No Match",
          confidence: 45.2,
          sampleQuality: 72,
          matchCount: 0,
          processingTime: "2.5s",
        },
        {
          id: "2",
          name: "Facial Recognition",
          icon: "👤",
          status: "Matched",
          confidence: 92.3,
          sampleQuality: 89,
          matchCount: 6,
          processingTime: "3.2s",
        },
        {
          id: "3",
          name: "Voice Analysis",
          icon: "🎤",
          status: "Matched",
          confidence: 85.7,
          sampleQuality: 81,
          matchCount: 3,
          processingTime: "4.1s",
        },
      ],
    },
    {
      id: "3",
      caseId: "CASE-2024-003",
      suspectId: "SUSP-003",
      name: "Robert Johnson",
      matchScore: 95.8,
      consensusResult: "High Confidence Match",
      verified: true,
      modalities: [
        {
          id: "1",
          name: "Fingerprint",
          icon: "👆",
          status: "Matched",
          confidence: 97.3,
          sampleQuality: 94,
          matchCount: 10,
          processingTime: "2.4s",
        },
        {
          id: "2",
          name: "Facial Recognition",
          icon: "👤",
          status: "Matched",
          confidence: 96.2,
          sampleQuality: 93,
          matchCount: 7,
          processingTime: "3.0s",
        },
        {
          id: "3",
          name: "Iris Scan",
          icon: "👁️",
          status: "Matched",
          confidence: 93.9,
          sampleQuality: 91,
          matchCount: 4,
          processingTime: "2.9s",
        },
      ],
    },
  ]);

  const [selectedResult, setSelectedResult] = useState<BiometricResult | null>(results[0]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 95) return "var(--success)";
    if (confidence >= 85) return "var(--accent)";
    if (confidence >= 70) return "var(--warning)";
    return "var(--danger)";
  };

  const getStatusColor = (status: string): string => {
    if (status === "Matched") return "var(--success)";
    if (status === "Processing") return "var(--accent)";
    return "var(--danger)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />

        <main className="page-main">
          <div className="page-header">
            <div className="page-title">
              <h1>Multi-Modal Biometric Fusion</h1>
              <p style={{ margin: "var(--spacing-sm) 0 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Advanced biometric identification combining fingerprint, facial, iris, and voice analysis
              </p>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary">+ New Analysis</button>
            </div>
          </div>

          {/* Results Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--spacing-xl)", marginBottom: "var(--spacing-xl)" }}>
            {/* Results List */}
            <div>
              <div className="card">
                <h3 style={{ margin: "0 0 var(--spacing-lg) 0", fontSize: "var(--text-lg)" }}>
                  Analysis Results
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedResult(result)}
                      style={{
                        padding: "var(--spacing-lg)",
                        border: selectedResult?.id === result.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: selectedResult?.id === result.id ? "var(--surface-light)" : "transparent",
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
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{result.name}</div>
                        {result.verified && (
                          <span style={{ fontSize: "var(--text-lg)" }}>✓</span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "var(--spacing-sm)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>{result.caseId}</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: getConfidenceColor(result.matchScore),
                            fontSize: "var(--text-base)",
                          }}
                        >
                          {result.matchScore}%
                        </span>
                      </div>
                      <div style={{ position: "relative", height: "6px", backgroundColor: "var(--border)", borderRadius: "var(--radius-full)" }}>
                        <div
                          style={{
                            position: "absolute",
                            height: "100%",
                            backgroundColor: getConfidenceColor(result.matchScore),
                            borderRadius: "var(--radius-full)",
                            width: `${result.matchScore}%`,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            {selectedResult && (
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
                      <h3 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{selectedResult.name}</h3>
                      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                        {selectedResult.suspectId}
                      </p>
                    </div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: selectedResult.verified ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        color: selectedResult.verified ? "var(--success)" : "var(--warning)",
                        border: `1px solid ${selectedResult.verified ? "var(--success)" : "var(--warning)"}`,
                      }}
                    >
                      {selectedResult.verified ? "Verified" : "Needs Review"}
                    </span>
                  </div>

                  <div
                    style={{
                      textAlign: "center",
                      padding: "var(--spacing-xl)",
                      backgroundColor: "var(--surface-light)",
                      borderRadius: "var(--radius-lg)",
                      marginBottom: "var(--spacing-lg)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "var(--text-4xl)",
                        fontWeight: 900,
                        background: `linear-gradient(135deg, ${getConfidenceColor(selectedResult.matchScore)}, var(--secondary))`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        marginBottom: "var(--spacing-sm)",
                      }}
                    >
                      {selectedResult.matchScore}%
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "var(--spacing-sm)",
                      }}
                    >
                      {selectedResult.consensusResult}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      Based on {selectedResult.modalities.length} biometric modalities
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--spacing-lg)" }}>
                  <h4 style={{ margin: "0 0 var(--spacing-lg) 0" }}>Modality Analysis</h4>

                  {selectedResult.modalities.map((modality) => (
                    <div
                      key={modality.id}
                      style={{
                        padding: "var(--spacing-lg)",
                        backgroundColor: "var(--surface-light)",
                        borderRadius: "var(--radius-lg)",
                        marginBottom: "var(--spacing-lg)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "var(--spacing-md)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                          <span style={{ fontSize: "var(--text-2xl)" }}>{modality.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{modality.name}</div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                              {modality.processingTime} processing time
                            </div>
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${getStatusColor(modality.status)}40`,
                            color: getStatusColor(modality.status),
                            border: `1px solid ${getStatusColor(modality.status)}`,
                          }}
                        >
                          {modality.status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "var(--spacing-md)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <div>
                          <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                            CONFIDENCE
                          </div>
                          <div style={{ color: getConfidenceColor(modality.confidence), fontWeight: 700 }}>
                            {modality.confidence}%
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                            SAMPLE QUALITY
                          </div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                            {modality.sampleQuality}%
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                            MATCHES
                          </div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                            {modality.matchCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "var(--spacing-xl)", display: "flex", gap: "var(--spacing-md)" }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>
                    Verify Match
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1 }}>
                    View Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
