import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--background)",
        padding: "var(--spacing-xl)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "600px" }}>
        <div style={{ fontSize: "clamp(4rem, 10vw, 8rem)", fontWeight: 900, color: "var(--accent)", marginBottom: "var(--spacing-lg)" }}>
          404
        </div>
        <h1 style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--spacing-lg)" }}>
          Page Not Found
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--spacing-2xl)", fontSize: "var(--text-lg)" }}>
          The page you're looking for doesn't exist or is still under development. Ask the developer to add this page!
        </p>
        <div style={{ display: "flex", gap: "var(--spacing-lg)", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/")}>
            Back to Home
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
