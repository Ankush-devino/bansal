import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";

interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

interface CaseItem {
  id: string;
  caseId: string;
  title: string;
  status: string;
  assigned: string;
  priority: string;
}

export default function Dashboard() {
  const metrics: DashboardMetric[] = [
    { label: "Active Cases", value: "47", change: "+5 this week", isPositive: true },
    { label: "Evidence Items", value: "1,283", change: "+234 pending", isPositive: false },
    { label: "Pattern Matches", value: "23", change: "+3 today", isPositive: true },
    { label: "Avg Resolution", value: "12.5d", change: "-2.3d vs last month", isPositive: true },
  ];

  const recentCases: CaseItem[] = [
    {
      id: "1",
      caseId: "CASE-2024-001",
      title: "Breaking and Entering",
      status: "In Progress",
      assigned: "Officer Smith",
      priority: "High",
    },
    {
      id: "2",
      caseId: "CASE-2024-002",
      title: "Fraud Investigation",
      status: "Pending",
      assigned: "Officer Johnson",
      priority: "Medium",
    },
    {
      id: "3",
      caseId: "CASE-2024-003",
      title: "Digital Forensics",
      status: "In Progress",
      assigned: "Officer Davis",
      priority: "Critical",
    },
    {
      id: "4",
      caseId: "CASE-2024-004",
      title: "Biometric Match",
      status: "Completed",
      assigned: "Officer Wilson",
      priority: "High",
    },
    {
      id: "5",
      caseId: "CASE-2024-005",
      title: "Evidence Analysis",
      status: "In Progress",
      assigned: "Officer Brown",
      priority: "Medium",
    },
  ];

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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />

        <main className="page-main">
          <div className="page-header">
            <div className="page-title">
              <h1>Dashboard</h1>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary">New Case</button>
              <button className="btn btn-secondary">Generate Report</button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="dashboard-grid">
            {metrics.map((metric, idx) => (
              <div key={idx} className="dashboard-metric">
                <div className="metric-label">{metric.label}</div>
                <div className="metric-value">{metric.value}</div>
                <div className={`metric-change ${metric.isPositive ? "positive" : "negative"}`}>
                  <span>{metric.isPositive ? "📈" : "📉"}</span> {metric.change}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Cases */}
          <div className="list-view">
            <div style={{ padding: "var(--spacing-xl)", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", marginBottom: "var(--spacing-sm)" }}>
                Recent Cases
              </h2>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Showing 5 of 47 active cases
              </p>
            </div>

            <div className="list-header">
              <span>Case ID</span>
              <span>Title</span>
              <span>Assigned To</span>
              <span>Status</span>
              <span></span>
            </div>

            {recentCases.map((caseItem) => (
              <div key={caseItem.id} className="list-row">
                <div className="list-cell-primary">{caseItem.caseId}</div>
                <div className="list-cell-secondary">{caseItem.title}</div>
                <div className="list-cell-secondary">{caseItem.assigned}</div>
                <div>
                  <span className={`badge ${getStatusClass(caseItem.status)}`}>
                    {caseItem.status}
                  </span>
                </div>
                <button className="btn btn-ghost" style={{ padding: "var(--spacing-xs)" }}>
                  →
                </button>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div
            style={{
              marginTop: "var(--spacing-2xl)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--spacing-lg)",
            }}
          >
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--spacing-md)" }}>
                📊
              </div>
              <h3 style={{ margin: "0 0 var(--spacing-sm) 0" }}>Analytics</h3>
              <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>View detailed case analytics</p>
            </div>
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--spacing-md)" }}>
                🔍
              </div>
              <h3 style={{ margin: "0 0 var(--spacing-sm) 0" }}>Search Evidence</h3>
              <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>Find evidence quickly</p>
            </div>
            <div className="card" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--spacing-md)" }}>
                ⛓️
              </div>
              <h3 style={{ margin: "0 0 var(--spacing-sm) 0" }}>Audit Trail</h3>
              <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>View blockchain audit trail</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
