import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface BoardAnnotation {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  color: string;
}

interface CaseBoard {
  id: string;
  caseId: string;
  title: string;
  activeUsers: number;
  annotations: BoardAnnotation[];
  lastUpdated: string;
}

export default function Collaboration() {
  const [boards] = useState<CaseBoard[]>([
    {
      id: "1",
      caseId: "CASE-2024-001",
      title: "Breaking and Entering - Downtown",
      activeUsers: 3,
      lastUpdated: "2024-01-20 14:30",
      annotations: [
        { id: "1", author: "Officer Smith", text: "Fingerprint match on door handle", timestamp: "14:25", color: "var(--accent)" },
        { id: "2", author: "Officer Davis", text: "DNA sample requires further analysis", timestamp: "14:15", color: "var(--warning)" },
      ],
    },
    {
      id: "2",
      caseId: "CASE-2024-002",
      title: "Digital Fraud Investigation",
      activeUsers: 2,
      lastUpdated: "2024-01-20 13:45",
      annotations: [
        { id: "1", author: "Officer Johnson", text: "Transaction logs analyzed", timestamp: "13:40", color: "var(--success)" },
      ],
    },
    {
      id: "3",
      caseId: "CASE-2024-003",
      title: "Identity Theft Ring",
      activeUsers: 4,
      lastUpdated: "2024-01-20 14:50",
      annotations: [
        { id: "1", author: "Officer Brown", text: "Connected 5 suspects via facial recognition", timestamp: "14:48", color: "var(--accent)" },
        { id: "2", author: "Officer Wilson", text: "Coordinating with federal agents", timestamp: "14:40", color: "var(--secondary)" },
      ],
    },
  ]);

  const [selectedBoard, setSelectedBoard] = useState<CaseBoard | null>(boards[0]);
  const [newAnnotation, setNewAnnotation] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />

        <main className="page-main">
          <div className="page-header">
            <div className="page-title">
              <h1>Collaborative Investigation Board</h1>
              <p style={{ margin: "var(--spacing-sm) 0 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Real-time evidence analysis and team collaboration
              </p>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary">+ New Board</button>
            </div>
          </div>

          {/* Boards List and Active Board */}
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--spacing-xl)" }}>
            {/* Boards Sidebar */}
            <div>
              <div className="card">
                <h3 style={{ margin: "0 0 var(--spacing-lg) 0", fontSize: "var(--text-lg)" }}>
                  Active Boards
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => setSelectedBoard(board)}
                      style={{
                        padding: "var(--spacing-lg)",
                        border: selectedBoard?.id === board.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: selectedBoard?.id === board.id ? "var(--surface-light)" : "transparent",
                        cursor: "pointer",
                        transition: "all var(--transition-base)",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: "var(--spacing-xs)", color: "var(--text-primary)" }}>
                        {board.caseId}
                      </div>
                      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                        {board.title}
                      </p>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        👥 {board.activeUsers} active
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Board */}
            {selectedBoard && (
              <div>
                <div className="card" style={{ marginBottom: "var(--spacing-xl)" }}>
                  <div style={{ marginBottom: "var(--spacing-xl)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "var(--spacing-lg)",
                      }}
                    >
                      <div>
                        <h2 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{selectedBoard.title}</h2>
                        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                          {selectedBoard.caseId}
                        </p>
                      </div>
                      <div
                        style={{
                          padding: "var(--spacing-md) var(--spacing-lg)",
                          backgroundColor: "var(--surface-light)",
                          borderRadius: "var(--radius-lg)",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>ACTIVE USERS</div>
                        <div
                          style={{
                            fontSize: "var(--text-2xl)",
                            fontWeight: 900,
                            color: "var(--accent)",
                            marginTop: "var(--spacing-xs)",
                          }}
                        >
                          {selectedBoard.activeUsers}
                        </div>
                      </div>
                    </div>

                    {/* Virtual Board */}
                    <div
                      style={{
                        aspectRatio: "16 / 9",
                        border: "2px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: "var(--primary)",
                        padding: "var(--spacing-xl)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--spacing-lg)",
                        overflow: "auto",
                        marginBottom: "var(--spacing-lg)",
                      }}
                    >
                      <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--spacing-md)" }}>
                          📋
                        </div>
                        <p style={{ margin: 0 }}>Virtual Evidence Board - Real-time collaborative canvas</p>
                        <p style={{ margin: "var(--spacing-sm) 0 0 0", fontSize: "var(--text-sm)" }}>
                          Drag and drop evidence items, add annotations, and share insights with team members
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Annotations */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--spacing-lg)" }}>
                    <h3 style={{ margin: "0 0 var(--spacing-lg) 0" }}>Team Annotations</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)", marginBottom: "var(--spacing-lg)" }}>
                      {selectedBoard.annotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          style={{
                            padding: "var(--spacing-lg)",
                            backgroundColor: "var(--surface-light)",
                            borderRadius: "var(--radius-lg)",
                            borderLeft: `4px solid ${annotation.color}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                              marginBottom: "var(--spacing-sm)",
                            }}
                          >
                            <div style={{ fontWeight: 700, color: annotation.color }}>
                              {annotation.author}
                            </div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                              {annotation.timestamp}
                            </div>
                          </div>
                          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                            {annotation.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Add Annotation */}
                    <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
                      <textarea
                        className="textarea"
                        placeholder="Add your annotation here..."
                        value={newAnnotation}
                        onChange={(e) => setNewAnnotation(e.target.value)}
                        style={{ flex: 1, minHeight: "80px" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                        <button className="btn btn-primary" style={{ height: "auto", padding: "var(--spacing-lg)" }}>
                          Post
                        </button>
                        <button className="btn btn-ghost" style={{ height: "auto", padding: "var(--spacing-lg)" }}>
                          Tag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="card">
                  <h3 style={{ margin: "0 0 var(--spacing-lg) 0" }}>Team Members</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: "var(--spacing-lg)",
                    }}
                  >
                    {["Officer Smith", "Officer Davis", "Officer Johnson", "Officer Wilson"].map((officer, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "var(--spacing-lg)",
                          backgroundColor: "var(--surface-light)",
                          borderRadius: "var(--radius-lg)",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--spacing-sm)" }}>
                          👤
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: "var(--spacing-xs)", fontSize: "var(--text-sm)" }}>
                          {officer}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--success)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "var(--spacing-xs)",
                          }}
                        >
                          ● Online
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
