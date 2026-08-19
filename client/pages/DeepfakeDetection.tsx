import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import "../styles/deepfake.css";

const API_BASE = "http://localhost:8000";

// Labels from the new ensemble model
type DetectionLabel = "AI_GENERATED" | "FAKE" | "REAL";

interface ImageResult {
  type: "image";
  label: DetectionLabel;
  confidence: number;
  heatmap_b64: string;
  inference_ms: number;
  filename: string;
  detail?: { primary_ai_score: number; secondary_ai_score: number; ensemble_ai_score: number };
}

interface VideoFrameResult {
  frame_index: number;
  timestamp_s: number;
  label: DetectionLabel;
  confidence: number;
}

interface VideoResult {
  type: "video";
  aggregate_label: DetectionLabel;
  aggregate_confidence: number;
  /** Ratio of AI/FAKE frames (from either model) */
  fake_frame_ratio?: number;
  ai_frame_ratio?: number;
  total_frames_sampled: number;
  frames: VideoFrameResult[];
  filename: string;
}

type DetectionResult = ImageResult | VideoResult;

interface HistoryItem {
  id: string;
  filename: string;
  label: DetectionLabel;
  confidence: number;
  timestamp: string;
  previewUrl?: string;
}

interface ModelMeta {
  best_val_accuracy?: number;
  model_name?: string;
  primary_model?: string;
  secondary_model?: string;
  dataset?: string;
  architecture?: string;
}

export default function DeepfakeDetection() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modelMeta, setModelMeta] = useState<ModelMeta | null>(null);
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [fakeDetected, setFakeDetected] = useState(0);

  // Check API health on mount
  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setApiReady(true);
        if (data.accuracy) {
          setModelMeta({
            best_val_accuracy: data.accuracy,
            model_name: data.model_name,
            dataset: data.dataset,
          });
        }
      } else {
        setApiReady(false);
      }
    } catch {
      setApiReady(false);
    }
  }, []);

  // Fetch model-info on mount
  const fetchModelInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/model-info`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data.best_val_accuracy) setModelMeta(data);
      }
    } catch {/* silent */}
  }, []);

  useState(() => {
    checkApi();
    fetchModelInfo();
  });

  // ── File selection ─────────────────────────────────────────────────────────
  const isVideo = (f: File) => f.type.startsWith("video/");

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const endpoint = isVideo(file) ? "/detect-video" : "/detect";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      const typed: DetectionResult = isVideo(file)
        ? { type: "video", ...data }
        : { type: "image", ...data };

      setResult(typed);

      const label = typed.type === "image" ? typed.label : typed.aggregate_label;
      const conf  = typed.type === "image" ? typed.confidence : typed.aggregate_confidence;

      setTotalAnalyzed((n) => n + 1);
      // Count both old "FAKE" label and new "AI_GENERATED" label
      if (label === "FAKE" || label === "AI_GENERATED") setFakeDetected((n) => n + 1);

      setHistory((prev) => [
        {
          id: Date.now().toString(),
          filename: file.name,
          label,
          confidence: conf,
          timestamp: new Date().toLocaleTimeString(),
          previewUrl: isVideo(file) ? undefined : previewUrl ?? undefined,
        },
        ...prev.slice(0, 4),
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(
        msg.includes("fetch") || msg.includes("Failed")
          ? "Cannot reach the detection API. Make sure the FastAPI server is running on port 8000."
          : msg
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const accuracyPct =
    modelMeta?.best_val_accuracy != null
      ? `${Math.round(modelMeta.best_val_accuracy * 100)}%`
      : "—";

  const renderResult = () => {
    if (!result) {
      return (
        <div className="df-empty-state">
          <span className="empty-icon">🔍</span>
          <p>Upload a file and click Analyze to see the results</p>
        </div>
      );
    }

    if (result.type === "image") {
      const isAI    = result.label === "AI_GENERATED" || result.label === "FAKE";
      const confFrac = result.confidence / 100;
      const displayLabel = result.label === "AI_GENERATED" ? "AI GENERATED" : result.label;

      return (
        <div className="df-result-panel">
          {/* Verdict */}
          <div className={`df-verdict ${isAI ? "fake" : "real"}`}>
            <span className="df-verdict-icon">{isAI ? "🤖" : "✅"}</span>
            <div className="df-verdict-text">
              <h2>{displayLabel}</h2>
              <p>{isAI ? "AI-generated image detected (DALL-E / Stable Diffusion / Midjourney)" : "No AI generation detected — likely a real photo"}</p>
              <div className="df-conf-section">
                <div className="df-conf-label">
                  <span>Confidence</span>
                  <span>{result.confidence}%</span>
                </div>
                <div className="df-conf-bar-wrap">
                  <div
                    className="df-conf-bar"
                    style={{ width: `${confFrac * 100}%` }}
                  />
                </div>
              </div>
              <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.5 }}>
                Inference: {result.inference_ms}ms
              </p>
            </div>
          </div>

          {/* Grad-CAM */}
          {result.heatmap_b64 && (
            <div className="df-heatmap-section">
              <div className="df-heatmap-title">
                🔥 Grad-CAM Activation Heatmap
              </div>
              <img
                className="df-heatmap-img"
                src={`data:image/png;base64,${result.heatmap_b64}`}
                alt="Grad-CAM heatmap"
              />
              <div className="df-heatmap-legend">
                <span>Low</span>
                <div className="df-heatmap-grad" />
                <span>High</span>
                <span style={{ marginLeft: "auto", opacity: 0.7 }}>
                  Suspicious regions
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Video result
    const isAI     = result.aggregate_label === "AI_GENERATED" || result.aggregate_label === "FAKE";
    const confFrac  = result.aggregate_confidence / 100;
    const frameRatio = result.ai_frame_ratio ?? result.fake_frame_ratio ?? 0;
    const displayAggLabel = result.aggregate_label === "AI_GENERATED" ? "AI GENERATED" : result.aggregate_label;

    return (
      <div className="df-result-panel">
        <div className={`df-verdict ${isAI ? "fake" : "real"}`}>
          <span className="df-verdict-icon">{isAI ? "🤖" : "✅"}</span>
          <div className="df-verdict-text">
            <h2>{displayAggLabel}</h2>
            <p>
              {frameRatio}% of frames flagged as AI •{" "}
              {result.total_frames_sampled} frames analyzed
            </p>
            <div className="df-conf-section">
              <div className="df-conf-label">
                <span>Avg Confidence</span>
                <span>{result.aggregate_confidence}%</span>
              </div>
              <div className="df-conf-bar-wrap">
                <div
                  className="df-conf-bar"
                  style={{ width: `${confFrac * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="df-video-frames">
          {result.frames.map((f) => (
            <div key={f.frame_index} className="df-frame-row">
              <span style={{ color: "rgba(255,255,255,0.5)", minWidth: 70 }}>
                {f.timestamp_s}s
              </span>
              <span className={`df-frame-label ${f.label === "AI_GENERATED" || f.label === "FAKE" ? "fake" : "real"}`}>
                {f.label === "AI_GENERATED" ? "AI" : f.label}
              </span>
              <span style={{ color: "rgba(255,255,255,0.45)", marginLeft: "auto" }}>
                {f.confidence}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="deepfake-page">
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="deepfake-main">
          {/* Header */}
          <div className="deepfake-header">
            <div className="deepfake-header-icon">🔍</div>
            <div className="deepfake-header-text">
              <h1>AI Image Detection</h1>
              <p>
                Ensemble detector (ViT + ResNet) — identifies DALL-E, ChatGPT, Stable Diffusion &amp; Midjourney images
              </p>
            </div>
            <div
              className="deepfake-badge"
              style={
                apiReady === false
                  ? { borderColor: "rgba(239,68,68,0.3)", color: "#f87171", background: "rgba(239,68,68,0.08)" }
                  : {}
              }
            >
              <span
                className="deepfake-badge-dot"
                style={apiReady === false ? { background: "#f87171" } : {}}
              />
              {apiReady === null ? "Checking API…" : apiReady ? "Model Ready" : "API Offline"}
            </div>
          </div>

          {/* API error banner */}
          {apiReady === false && (
            <div className="df-api-error">
              ⚠️ FastAPI server not detected on port 8000. Run{" "}
              <code style={{ fontFamily: "monospace" }}>
                deepfake_api\start.bat
              </code>{" "}
              to start the detection service.
            </div>
          )}

          {/* Stats */}
          <div className="deepfake-stats">
            <div className="df-stat-card">
              <div className="df-stat-val">{accuracyPct}</div>
              <div className="df-stat-label">Model Accuracy</div>
            </div>
            <div className="df-stat-card">
              <div className="df-stat-val">{totalAnalyzed}</div>
              <div className="df-stat-label">Files Analyzed</div>
            </div>
            <div className="df-stat-card">
              <div className="df-stat-val">{fakeDetected}</div>
              <div className="df-stat-label">Fakes Detected</div>
            </div>
            <div className="df-stat-card">
              <div className="df-stat-val">Ensemble</div>
              <div className="df-stat-label">ViT + ResNet</div>
            </div>
          </div>

          {/* Main content */}
          <div className="deepfake-content">
            {/* Upload Panel */}
            <div className="df-panel">
              <div className="df-panel-title">📤 Upload Media</div>

              {!file ? (
                <div
                  id="deepfake-dropzone"
                  className={`df-dropzone${dragOver ? " drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <span className="df-dropzone-icon">🖼️</span>
                  <h3>Drag & drop or click to upload</h3>
                  <p>Supports images and video files</p>
                  <div className="df-file-types">
                    {["JPG", "PNG", "WEBP", "MP4", "AVI", "MOV"].map((ext) => (
                      <span key={ext} className="df-file-type-tag">.{ext}</span>
                    ))}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="deepfake-file-input"
                    accept="image/*,video/*"
                    onChange={handleInputChange}
                  />
                </div>
              ) : (
                <div className="df-preview-container">
                  {isVideo(file) ? (
                    <video src={previewUrl!} controls muted />
                  ) : (
                    <img src={previewUrl!} alt="Preview" />
                  )}
                  <button
                    className="df-preview-clear"
                    id="deepfake-clear-btn"
                    onClick={clearFile}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              )}

              {file && (
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                  📄 {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}

              <button
                id="deepfake-analyze-btn"
                className="df-analyze-btn"
                disabled={!file || analyzing}
                onClick={analyze}
              >
                {analyzing ? (
                  <>
                    <span className="df-spinner" />
                    Analyzing…
                  </>
                ) : (
                  <>🤖 Analyze for AI Generation</>
                )}
              </button>

              {error && (
                <div className="df-api-error">⚠️ {error}</div>
              )}
            </div>

            {/* Result Panel */}
            <div className="df-panel" style={{ minHeight: 380 }}>
              <div className="df-panel-title">📊 Analysis Result</div>
              {renderResult()}
            </div>
          </div>

          {/* History */}
          <div className="df-history">
            <div className="df-history-header">🕐 Recent Analyses</div>
            {history.length === 0 ? (
              <div className="df-history-empty">No analyses yet</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="df-history-row">
                  {item.previewUrl ? (
                    <img
                      className="df-hist-thumb"
                      src={item.previewUrl}
                      alt="thumb"
                    />
                  ) : (
                    <div className="df-hist-thumb" style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>🎬</div>
                  )}
                  <div className="df-hist-info">
                    <div className="df-hist-name">{item.filename}</div>
                    <div className="df-hist-time">{item.timestamp}</div>
                  </div>
                  <span className={`df-hist-verdict ${item.label === "AI_GENERATED" || item.label === "FAKE" ? "fake" : "real"}`}>
                    {item.label === "AI_GENERATED" ? "AI GEN" : item.label}
                  </span>
                  <span className="df-hist-conf">{item.confidence}%</span>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
