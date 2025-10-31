import { useNavigate } from "react-router-dom";

export function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <div className="navbar-brand-icon">⚖️</div>
          <span>ForensicAI</span>
        </div>
        <ul className="navbar-menu">
          <li>
            <a href="#profile" style={{ cursor: "pointer" }}>
              Profile
            </a>
          </li>
          <li>
            <a href="#settings" style={{ cursor: "pointer" }}>
              Settings
            </a>
          </li>
          <li>
            <a href="#help" style={{ cursor: "pointer" }}>
              Help
            </a>
          </li>
          <li>
            <button className="navbar-button" onClick={() => navigate("/")}>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
