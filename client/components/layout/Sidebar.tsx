import { useNavigate, useLocation } from "react-router-dom";

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard" },
  { id: "cases", label: "Cases", icon: "📋", path: "/cases" },
  { id: "evidence", label: "Evidence", icon: "🔍", path: "/evidence" },
  { id: "assignment", label: "Assignment", icon: "🎯", path: "/assignment" },
  { id: "biometric", label: "Biometrics", icon: "🔐", path: "/biometric" },
  { id: "reports", label: "Reports", icon: "📄", path: "/reports" },
  { id: "audit", label: "Audit Trail", icon: "⛓️", path: "/audit" },
  { id: "collaboration", label: "Collaboration", icon: "👥", path: "/collaboration" },
  { id: "crime-scene", label: "Crime Scene", icon: "🏗️", path: "/crime-scene" },
  { id: "deepfake", label: "Deepfake", icon: "🤖", path: "/deepfake-detection" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="page-sidebar">
      <ul className="sidebar-menu">
        {sidebarItems.map((item) => (
          <li key={item.id}>
            <button
              className={`sidebar-menu-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              style={{ width: "100%" }}
            >
              <span className="sidebar-menu-item-icon">{item.icon}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
