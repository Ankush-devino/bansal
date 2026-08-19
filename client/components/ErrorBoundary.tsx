import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0f0f1e",
              color: "#fff",
              fontFamily: "Inter, sans-serif",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ marginBottom: "0.5rem", color: "#fff" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#b0b0c0", marginBottom: "1.5rem", maxWidth: 480 }}>
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              style={{
                background: "#00d4ff",
                color: "#0f0f1e",
                border: "none",
                borderRadius: "8px",
                padding: "0.75rem 1.5rem",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Go Home
            </button>
            <details
              style={{
                marginTop: "1.5rem",
                color: "#80809a",
                fontSize: "0.8rem",
                maxWidth: 600,
                textAlign: "left",
              }}
            >
              <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
                Error details
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
