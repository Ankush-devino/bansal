import { useNavigate } from "react-router-dom";
import "../styles/hero.css";

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      id: 1,
      icon: "🏗️",
      title: "Crime Scene Reconstruction",
      description:
        "Upload crime scene photos to generate immersive 3D reconstructions, measure spatial distances, and pinpoint evidence locations.",
      bullets: [
        "Upload crime scene photos",
        "Generate a 3D reconstruction",
        "Measure distances",
        "Mark evidence locations",
      ],
      route: "/crime-scene",
    },
    {
      id: 2,
      icon: "🔍",
      title: "Deepfake Detection",
      description:
        "Advanced neural networks analyze digital media to detect AI manipulation, synthetic faces, and deepfake audio or video.",
      bullets: [
        "Image & video analysis",
        "EfficientNet-B0 neural network",
        "Grad-CAM heatmap visualization",
        "Frame-by-frame video scan",
      ],
      route: "/deepfake-detection",
    },
    {
      id: 3,
      icon: "🎯",
      title: "Smart Case Assignment",
      description:
        "Assign cases considering officer specialization, workload, success rates, and geographic proximity.",
    },
    {
      id: 4,
      icon: "🔐",
      title: "Multi-Modal Biometric Fusion",
      description:
        "Combine fingerprint, facial recognition, iris scan, and voice analysis with confidence scores.",
    },
    {
      id: 5,
      icon: "📄",
      title: "Automated Report Generation",
      description:
        "NLP-powered preliminary forensic reports from evidence analysis that experts can review and edit.",
    },
    {
      id: 6,
      icon: "🔗",
      title: "Cross-Case Pattern Analysis",
      description:
        "AI identifies similarities between current and historical cases for modus operandi matching.",
    },
    {
      id: 7,
      icon: "🏥",
      title: "Virtual Autopsy Integration",
      description:
        "CT/MRI scan visualization tools for non-invasive examination and documentation.",
    },
    {
      id: 8,
      icon: "📊",
      title: "Evidence Degradation Tracking",
      description:
        "Monitor storage conditions with IoT sensors and alerts when evidence integrity is threatened.",
    },
    {
      id: 9,
      icon: "⛓️",
      title: "Blockchain Audit Trail",
      description:
        "Tamper-proof history of evidence access, tests, and chain of custody transfers.",
    },
    {
      id: 10,
      icon: "👥",
      title: "Collaborative Investigation Board",
      description:
        "Real-time virtual evidence board for simultaneous analysis, annotations, and insights sharing.",
    },
    {
      id: 11,
      icon: "🌐",
      title: "Expert Network Consultation",
      description:
        "Video conferencing for consulting with specialized forensic experts from partner agencies.",
    },
    {
      id: 12,
      icon: "🤖",
      title: "Model Version Control",
      description:
        "Store deep learning model versions on blockchain for court-admissible evidence analysis.",
    },
  ];

  const capabilities = [
    {
      number: "01",
      title: "Pre-Processing Pipeline",
      description: "Evidence uploaded → IPFS storage → Smart contract records → AI processing",
    },
    {
      number: "02",
      title: "Chain of Custody with AI",
      description: "Evidence transfers logged with AI integrity verification and automatic alerts",
    },
    {
      number: "03",
      title: "Collaborative Training",
      description: "Federated learning from multiple stations while preserving data privacy",
    },
    {
      number: "04",
      title: "Evidence Matching Consensus",
      description: "Multiple model voting mechanism with consensus recording and signatures",
    },
  ];

  const stats = [
    { number: "99.9%", label: "Evidence Integrity" },
    { number: "2.3x", label: "Faster Case Resolution" },
    { number: "47", label: "Pattern Matches/Day" },
    { number: "15+", label: "Integration Points" },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <div className="navbar-brand-icon">⚖️</div>
            <span>ForensicAI</span>
          </div>
          <ul className="navbar-menu">
            <li>
              <a href="#features" style={{ cursor: "pointer" }}>
                Features
              </a>
            </li>
            <li>
              <a href="#capabilities" style={{ cursor: "pointer" }}>
                Capabilities
              </a>
            </li>
            <li>
              <a href="#" style={{ cursor: "pointer" }}>
                Documentation
              </a>
            </li>
            <li>
              <button
                className="navbar-button"
                onClick={() => navigate("/dashboard")}
              >
                Launch App
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-subtitle">Forensic Department Interface</div>
          <h1 className="hero-title">
            AI-Powered <span className="hero-title-accent">Evidence Analysis</span> & Blockchain
            Verification
          </h1>
          <p className="hero-description">
            A comprehensive platform combining deep learning, blockchain technology, and forensic
            expertise to ensure every piece of evidence is analyzed, documented, and preserved with
            absolute integrity and transparency.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/dashboard")}>
              Access Dashboard
            </button>
            <button className="btn btn-ghost btn-lg">Watch Demo</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="max-w-container">
          <div className="section-header">
            <div className="section-subtitle">Powered by AI & Blockchain</div>
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-description">
              A complete forensic analysis ecosystem with 12 advanced features for modern
              investigation
            </p>
          </div>

          <div className="grid grid-cols-4 gap-xl">
            {features.map((feature) => (
              <div
                key={feature.id}
                className={`feature-card${feature.route ? " feature-card-link" : ""}`}
                onClick={() => feature.route && navigate(feature.route)}
                style={{ cursor: feature.route ? "pointer" : "default" }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                {feature.bullets && (
                  <ul className="feature-bullets">
                    {feature.bullets.map((bullet, idx) => (
                      <li key={idx}>
                        <span className="bullet-dot">•</span> {bullet}
                      </li>
                    ))}
                  </ul>
                )}
                {feature.route && (
                  <div className="feature-open-btn">Open Tool →</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="capabilities-section">
        <div className="max-w-container">
          <div className="section-header" style={{ marginBottom: "var(--spacing-3xl)" }}>
            <div className="section-subtitle">Technical Integration</div>
            <h2 className="section-title">Specific Integration Patterns</h2>
          </div>

          <div className="capabilities-grid">
            {capabilities.map((cap, idx) => (
              <div key={idx} className="capability-item">
                <div className="capability-number">{cap.number}</div>
                <div className="capability-content">
                  <h4>{cap.title}</h4>
                  <p>{cap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="max-w-container">
          <div className="stats-grid">
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-card">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Transform Your Investigation</h2>
          <p className="cta-description">
            Start leveraging AI-powered forensics combined with blockchain verification today
          </p>
          <div className="hero-buttons" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/dashboard")}>
              Get Started Now
            </button>
            <button className="btn btn-ghost btn-lg">Contact Support</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-section">
              <h3>ForensicAI</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Advanced forensic analysis platform powered by AI and blockchain technology.
              </p>
            </div>
            <div className="footer-section">
              <h3>Product</h3>
              <a href="#features">Features</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#">Pricing</a>
              <a href="#">Security</a>
            </div>
            <div className="footer-section">
              <h3>Company</h3>
              <a href="#">About Us</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-section">
              <h3>Resources</h3>
              <a href="#">Documentation</a>
              <a href="#">API Reference</a>
              <a href="#">Guides</a>
              <a href="#">Support</a>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copyright">
              © 2024 ForensicAI. All rights reserved.
            </div>
            <div className="footer-socials">
              <a href="#" className="footer-social-link">
                f
              </a>
              <a href="#" className="footer-social-link">
                t
              </a>
              <a href="#" className="footer-social-link">
                in
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
