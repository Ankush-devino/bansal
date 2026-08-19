import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import { useForensicStore } from "@/hooks/useForensicStore";

const API = "http://localhost:8002";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Suspect {
  id: string;
  name: string;
  age: number;
  city: string;
  state: string;
  aadhaar: string;
  blood_group?: string;
  gender?: string;
  criminal_history: string[];
}

interface AnalysisResult {
  result_id: string;
  modality: string;
  case_id: string;
  filename: string;
  analysis: Record<string, any>;
  top_match: { suspect: Suspect; score: number };
  top_matches: { suspect: Suspect; score: number }[];
  match_score: number;
  verdict: string;
  timestamp: string;
}

interface UploadState {
  file: File | null;
  dragging: boolean;
  loading: boolean;
  error: string;
  result: AnalysisResult | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 90) return "#10b981";
  if (s >= 75) return "#00d4ff";
  if (s >= 60) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(s: number) {
  if (s >= 92) return "Match Confirmed";
  if (s >= 80) return "High Confidence Match";
  if (s >= 65) return "Partial Match";
  if (s >= 45) return "Low Confidence";
  return "No Match";
}

function fmtDT(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN") +
    " · " +
    d.toLocaleTimeString("en-IN", { hour12: true, hour: "2-digit", minute: "2-digit" })
  );
}

// ── Radial Score Ring ──────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.19}
        fontWeight="900"
        fontFamily="Inter,sans-serif"
      >
        {score.toFixed(0)}%
      </text>
    </svg>
  );
}

// ── Stat Chip ──────────────────────────────────────────────────────────────────

function Chip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 10,
        padding: "0.6rem 0.875rem",
        border: `1px solid ${color ? color + "30" : "var(--border)"}`,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "0.2rem",
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: color || "var(--text-primary)" }}>
        {String(value)}
      </div>
    </div>
  );
}

// ── DNA Loci Table ─────────────────────────────────────────────────────────────

function DNALociTable({ profile }: { profile: Record<string, number[]> }) {
  const loci = Object.keys(profile).slice(0, 15);
  return (
    <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.4rem" }}>
        CODIS-15 STR Profile
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            {loci.map((locus) => (
              <th
                key={locus}
                style={{
                  padding: "4px 8px",
                  background: "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  fontWeight: 700,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {locus}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {loci.map((locus, i) => (
              <td
                key={i}
                style={{
                  padding: "4px 8px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-family-mono)",
                  fontSize: 11,
                }}
              >
                {Array.isArray(profile[locus]) ? profile[locus].join(",") : String(profile[locus])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Top Matches List ───────────────────────────────────────────────────────────

function TopMatches({ matches }: { matches: { suspect: Suspect; score: number }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {matches.slice(0, 5).map((m, i) => (
        <div
          key={m.suspect.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.6rem 0.875rem",
            background: i === 0 ? "rgba(16,185,129,0.06)" : "var(--surface)",
            border: `1px solid ${i === 0 ? "#10b98140" : "var(--border)"}`,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: `linear-gradient(135deg,${scoreColor(m.score)},${scoreColor(m.score)}80)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 12,
              color: "#0f0f1e",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--text-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {m.suspect.name}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {m.suspect.city} · {m.suspect.aadhaar}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 900, fontSize: "var(--text-sm)", color: scoreColor(m.score) }}>
              {m.score.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{scoreLabel(m.score)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Result Panel ───────────────────────────────────────────────────────────────

function ResultPanel({ result, color, icon }: { result: AnalysisResult; color: string; icon: string }) {
  const a = result.analysis;
  const isMatch = result.match_score >= 75;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${isMatch ? color + "50" : "var(--border)"}`,
        borderRadius: 16,
        overflow: "hidden",
        animation: "fadeInUp 0.4s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: `linear-gradient(135deg, ${color}15, transparent)`,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `linear-gradient(135deg,${color},${color}80)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.6rem",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "var(--text-lg)" }}>{result.modality} Analysis Complete</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            {result.filename} · {fmtDT(result.timestamp)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <ScoreRing score={result.match_score} size={80} />
          <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(result.match_score), marginTop: "0.3rem" }}>
            {result.verdict}
          </div>
        </div>
      </div>

      <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Top Match */}
        {result.top_match && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
              🎯 Best Match
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                padding: "1rem",
                background: isMatch ? "rgba(16,185,129,0.06)" : "var(--surface-light)",
                border: `1px solid ${isMatch ? "#10b98140" : "var(--border)"}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#c084fc,#9333ea)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {result.top_match.suspect.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--text-base)" }}>{result.top_match.suspect.name}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {result.top_match.suspect.city}, {result.top_match.suspect.state} · Age {result.top_match.suspect.age}
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                  {result.top_match.suspect.criminal_history?.map((h: string) => (
                    <span key={h} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: "var(--text-2xl)", color: scoreColor(result.match_score) }}>
                  {result.match_score.toFixed(1)}%
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Match Score</div>
              </div>
            </div>
          </div>
        )}

        {/* DNA-specific */}
        {result.modality === "DNA" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
              🧬 Sequence Analysis
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <Chip label="Sequence Length" value={`${(a.sequence_length ?? 0).toLocaleString()} bp`} color="#10b981" />
              <Chip label="GC Content" value={`${a.gc_content ?? "—"}%`} color="#10b981" />
              <Chip label="AT Content" value={`${a.at_content ?? "—"}%`} color="#10b981" />
              <Chip label="Shannon Entropy" value={a.shannon_entropy ?? "—"} color="#10b981" />
              <Chip label="Complexity" value={`${a.sequence_complexity ?? "—"}%`} color="#10b981" />
              <Chip label="Loci Analyzed" value={`${a.loci_analyzed ?? "—"}/15`} color="#10b981" />
              <Chip label="CpG Islands" value={a.cpg_islands_detected ? "Detected" : "None"} color={a.cpg_islands_detected ? "#f59e0b" : "#10b981"} />
              <Chip label="Sex Marker" value={a.sex_marker_amelogenin ?? "—"} color="#c084fc" />
              <Chip label="Match Probability" value={a.match_probability ?? "—"} color="#ef4444" />
            </div>
            {a.str_profile && <DNALociTable profile={a.str_profile} />}
          </div>
        )}

        {/* Fingerprint-specific */}
        {result.modality === "Fingerprint" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
              👆 Ridge Analysis
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.6rem" }}>
              <Chip label="Pattern Type" value={a.pattern_type ?? "—"} color="#00d4ff" />
              <Chip label="Quality Score" value={`${a.quality_score ?? "—"}%`} color="#00d4ff" />
              <Chip label="Minutiae Points" value={a.minutiae_count ?? "—"} color="#00d4ff" />
              <Chip label="Ridge Endings" value={a.ridge_endings ?? "—"} color="#00d4ff" />
              <Chip label="Bifurcations" value={a.bifurcations ?? "—"} color="#00d4ff" />
              <Chip label="Ridge Energy" value={a.ridge_energy ?? "—"} color="#00d4ff" />
              <Chip label="Image Size" value={a.width && a.height ? `${a.width}x${a.height}` : "—"} color="#00d4ff" />
              <Chip label="Contrast" value={a.contrast ?? "—"} color="#00d4ff" />
            </div>
            {a.analysis_method && (
              <div style={{ marginTop: "0.75rem", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                Method: {a.analysis_method}
              </div>
            )}
          </div>
        )}

        {/* Iris-specific */}
        {result.modality === "Iris" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
              👁 IrisCode Analysis
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.6rem" }}>
              <Chip label="Iris Detected" value={a.iris_detected ? "Yes" : "No"} color={a.iris_detected ? "#c084fc" : "#ef4444"} />
              <Chip label="IrisCode Bits" value={`${a.irisCode_bits ?? 2048} bits`} color="#c084fc" />
              <Chip label="Quality Score" value={`${a.quality_score ?? "—"}%`} color="#c084fc" />
              <Chip label="Sharpness" value={a.sharpness ?? "—"} color="#c084fc" />
              <Chip label="Usable Area" value={`${a.usable_area_pct ?? "—"}%`} color="#c084fc" />
              <Chip label="Dilation Ratio" value={a.dilation_ratio ?? "—"} color="#c084fc" />
              {a.iris_radius_px && <Chip label="Iris Radius" value={`${a.iris_radius_px}px`} color="#c084fc" />}
              {a.pupil_iris_ratio && <Chip label="Pupil/Iris Ratio" value={a.pupil_iris_ratio} color="#c084fc" />}
            </div>
          </div>
        )}

        {/* Face-specific */}
        {result.modality === "Face" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
              😐 Face Analysis
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.6rem" }}>
              <Chip label="Face Detected" value={a.face_detected === true ? "Yes" : a.face_detected === false ? "No" : String(a.face_detected ?? "—")} color={a.face_detected === true ? "#f59e0b" : "#ef4444"} />
              <Chip label="Quality Score" value={`${a.quality_score ?? "—"}%`} color="#f59e0b" />
              <Chip label="Sharpness" value={a.sharpness ?? "—"} color="#f59e0b" />
              <Chip label="Brightness" value={a.brightness ?? "—"} color="#f59e0b" />
              <Chip label="HOG Features" value={a.hog_feature_dim ?? "—"} color="#f59e0b" />
              <Chip label="LBP Bins" value={a.lbp_texture_bins ?? "—"} color="#f59e0b" />
              {a.faces_in_image !== undefined && <Chip label="Faces in Image" value={a.faces_in_image} color="#f59e0b" />}
              {a.face_area_pct && <Chip label="Face Area" value={`${a.face_area_pct}%`} color="#f59e0b" />}
            </div>
          </div>
        )}

        {/* Voice-specific */}
        {result.modality === "Voice" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
              🎙 Voice Analysis
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <Chip label="Duration" value={`${a.duration_seconds ?? "—"}s`} color="#e94560" />
              <Chip label="Sample Rate" value={`${a.sample_rate ?? "—"} Hz`} color="#e94560" />
              <Chip label="Fundamental F0" value={`${a.fundamental_freq_f0 ?? "—"} Hz`} color="#e94560" />
              <Chip label="Spectral Centroid" value={`${a.spectral_centroid_hz ?? "—"} Hz`} color="#e94560" />
              <Chip label="Speech Ratio" value={`${a.speech_ratio_pct ?? "—"}%`} color="#e94560" />
              <Chip label="RMS Energy" value={a.rms_energy ?? "—"} color="#e94560" />
              <Chip label="Quality Score" value={`${a.quality_score ?? "—"}%`} color="#e94560" />
              <Chip label="ZCR" value={a.zero_crossing_rate ?? "—"} color="#e94560" />
            </div>
            {a.mfcc_mean && Array.isArray(a.mfcc_mean) && (
              <div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.4rem" }}>
                  MFCC Coefficients (13)
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(a.mfcc_mean as number[]).map((v, i) => {
                    const pct = Math.min(100, Math.max(0, ((v + 200) / 400) * 100));
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{ height: 40, display: "flex", alignItems: "flex-end", width: "100%" }}>
                          <div style={{ width: "100%", height: `${pct}%`, minHeight: 2, background: "linear-gradient(180deg,#e94560,#e9456080)", borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>{i + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Matches */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
            🏆 Top 5 Suspect Matches
          </div>
          <TopMatches matches={result.top_matches} />
        </div>
      </div>
    </div>
  );
}

// ── Drop Zone ──────────────────────────────────────────────────────────────────

function DropZone({
  accept, label, hint, icon, color, state, onFile, onClear,
}: {
  accept: string; label: string; hint: string; icon: string; color: string;
  state: UploadState; onFile: (f: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !state.file && inputRef.current?.click()}
        style={{
          border: `2px dashed ${state.file ? color + "80" : "var(--border)"}`,
          borderRadius: 14,
          padding: "1.5rem",
          textAlign: "center",
          cursor: state.file ? "default" : "pointer",
          background: state.file ? `${color}08` : "var(--surface)",
          transition: "all 0.2s",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {state.file ? (
          <>
            <div style={{ fontSize: "2rem" }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color }}>{state.file.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {(state.file.size / 1024).toFixed(1)} KB · Ready to analyze
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 8, padding: "4px 12px", fontSize: 11, cursor: "pointer", marginTop: "0.25rem" }}
            >
              Remove
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "2.5rem", opacity: 0.5 }}>{icon}</div>
            <div style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>{label}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div>
            <div style={{ marginTop: "0.25rem", fontSize: 11, color, fontWeight: 600 }}>Click or drag and drop</div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ── Sample DNA ────────────────────────────────────────────────────────────────

const SAMPLE_DNA = `>Forensic_STR_Sample_CODIS15
AGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGAT
TCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTA
CTTTCTTTCTTTCTTTCTTTCTTTCTTTCTTTCTTTCTTTCTTTCTTTCTTT
TCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTA
AGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAA
AGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGAT
TATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATCTATC
GATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATA
AATGAATGAATGAATGAATGAATGAATGAATGAATGAATGAATGAATGAATG
AGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGATAGAT
TGCCTGCCTGCCTGCCTGCCTGCCTGCCTGCCTGCCTGCCTGCCTGCCTGCC
AAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGG
GCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAG
CGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCC
ATCAATCAATCAATCAATCAATCAATCAATCAATCAATCAATCAATCAATCA`;

// ── Modality Configs ──────────────────────────────────────────────────────────

interface ModalityConfig {
  key: string; label: string; icon: string; color: string;
  endpoint: string; accept: string; dropLabel: string; dropHint: string; hasPaste?: boolean;
}

const MODALITIES: ModalityConfig[] = [
  { key: "dna", label: "DNA", icon: "🧬", color: "#10b981", endpoint: "/biometric/dna", accept: ".txt,.fasta,.fa,.csv", dropLabel: "Upload DNA / FASTA file", dropHint: ".fasta .txt .fa .csv — STR profile or raw sequence", hasPaste: true },
  { key: "fingerprint", label: "Fingerprint", icon: "👆", color: "#00d4ff", endpoint: "/biometric/fingerprint", accept: "image/*", dropLabel: "Upload fingerprint image", dropHint: "JPG, PNG, BMP, TIFF — any fingerprint scan" },
  { key: "iris", label: "Iris Scan", icon: "👁", color: "#c084fc", endpoint: "/biometric/iris", accept: "image/*", dropLabel: "Upload iris scan image", dropHint: "JPG, PNG — close-up eye or iris photograph" },
  { key: "face", label: "Face", icon: "😐", color: "#f59e0b", endpoint: "/biometric/face", accept: "image/*", dropLabel: "Upload face photograph", dropHint: "JPG, PNG — frontal face image recommended" },
  { key: "voice", label: "Voice", icon: "🎙", color: "#e94560", endpoint: "/biometric/voice", accept: ".wav,.mp3,.ogg,.flac,.m4a,audio/*", dropLabel: "Upload voice recording", dropHint: "WAV preferred — MP3, OGG, M4A also accepted" },
];

// ── Modality Upload Card ──────────────────────────────────────────────────────

function ModalityUploadCard({ config, cases, onResult }: { config: ModalityConfig; cases: { case_id: string; title: string }[]; onResult: (r: AnalysisResult) => void; }) {
  const [state, setState] = useState<UploadState>({ file: null, dragging: false, loading: false, error: "", result: null });
  const [caseId, setCaseId] = useState(cases[0]?.case_id ?? "CASE-001");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleFile = (f: File) => setState((s) => ({ ...s, file: f, error: "", result: null }));
  const handleClear = () => setState((s) => ({ ...s, file: null, error: "", result: null }));

  const hasInput = state.file || (config.hasPaste && showPaste && pasteText.trim().length > 20);
  const isLoaded = !!state.result;

  const run = async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const form = new FormData();
      form.append("case_id", caseId);
      if (config.hasPaste && showPaste && pasteText.trim()) {
        form.append("sequence", pasteText.trim());
      } else if (state.file) {
        form.append("file", state.file);
      } else {
        throw new Error("Please upload a file or paste a sequence");
      }
      const res = await fetch(`${API}${config.endpoint}`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Analysis failed");
      }
      const data: AnalysisResult = await res.json();
      data.modality = config.label;
      setState((s) => ({ ...s, loading: false, result: data }));
      onResult(data);
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message || "Analysis failed" }));
    }
  };

  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${isLoaded ? config.color + "40" : "var(--border)"}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.3s" }}>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.875rem", cursor: "pointer", background: `linear-gradient(135deg,${config.color}12,transparent)`, borderBottom: expanded ? "1px solid var(--border)" : "none" }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${config.color},${config.color}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
          {config.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "var(--text-base)" }}>{config.label} Analysis</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: "0.1rem" }}>
            {isLoaded ? `Match: ${state.result!.match_score.toFixed(1)}% — ${state.result!.verdict}` : state.file ? `${state.file.name}` : config.dropHint}
          </div>
        </div>
        {isLoaded && (
          <div style={{ fontWeight: 900, fontSize: "var(--text-lg)", color: scoreColor(state.result!.match_score) }}>
            {state.result!.match_score.toFixed(1)}%
          </div>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="input-group">
            <label className="label">Case ID</label>
            <select className="select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              {cases.map((c) => <option key={c.case_id} value={c.case_id}>{c.case_id} — {c.title}</option>)}
              <option value="CASE-CUSTOM-001">Custom Case</option>
            </select>
          </div>

          {config.hasPaste && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[{ v: false, label: "📁 Upload File" }, { v: true, label: "✏️ Paste Sequence" }].map(({ v, label }) => (
                <button key={String(v)} onClick={() => setShowPaste(v)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, fontWeight: 600, fontSize: 12, border: showPaste === v ? `2px solid ${config.color}` : "1px solid var(--border)", background: showPaste === v ? `${config.color}15` : "transparent", color: showPaste === v ? config.color : "var(--text-muted)", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {(!config.hasPaste || !showPaste) && (
            <DropZone accept={config.accept} label={config.dropLabel} hint={config.dropHint} icon={config.icon} color={config.color} state={state} onFile={handleFile} onClear={handleClear} />
          )}

          {config.hasPaste && showPaste && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={">Sample\nACGTACGTACGT..."}
                rows={7}
                style={{ width: "100%", background: "var(--surface-light)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem", color: "var(--text-primary)", fontFamily: "var(--font-family-mono)", fontSize: 11, resize: "vertical", boxSizing: "border-box" }}
              />
              <button
                onClick={() => setPasteText(SAMPLE_DNA)}
                style={{ alignSelf: "flex-start", background: `${config.color}15`, border: `1px solid ${config.color}40`, color: config.color, borderRadius: 8, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
              >
                Load Sample Forensic DNA
              </button>
            </div>
          )}

          {state.error && (
            <div className="alert alert-error" style={{ fontSize: "var(--text-sm)" }}>{state.error}</div>
          )}

          <button
            className="btn btn-primary"
            onClick={run}
            disabled={state.loading || !hasInput}
            style={{ background: `linear-gradient(135deg,${config.color},${config.color}aa)` }}
          >
            {state.loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing…</> : `${config.icon} Analyze ${config.label}`}
          </button>

          {state.result && (
            <ResultPanel result={state.result} color={config.color} icon={config.icon} />
          )}
        </div>
      )}
    </div>
  );
}

// ── History Card ──────────────────────────────────────────────────────────────

function HistoryCard({ result, active, onClick }: { result: AnalysisResult; active: boolean; onClick: () => void }) {
  const modConfig = MODALITIES.find((m) => m.label === result.modality);
  const color = modConfig?.color ?? "#c084fc";
  const icon = modConfig?.icon ?? "🔬";
  return (
    <div onClick={onClick} style={{ padding: "0.875rem 1rem", borderRadius: 12, cursor: "pointer", border: `1px solid ${active ? color : "var(--border)"}`, background: active ? `${color}08` : "var(--surface)", transition: "all 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--text-xs)" }}>{result.top_match?.suspect?.name ?? "Unknown"}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{result.modality} · {result.result_id}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 900, color: scoreColor(result.match_score), fontSize: "var(--text-sm)" }}>{result.match_score?.toFixed(1)}%</div>
          <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{result.verdict}</div>
        </div>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${result.match_score}%`, background: `linear-gradient(90deg,${color},${color}80)`, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: "0.3rem" }}>{fmtDT(result.timestamp)} · {result.filename}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Biometric() {
  const { cases } = useForensicStore();
  const [apiOnline, setApiOnline] = useState(false);
  const [apiInfo, setApiInfo] = useState<any>(null);
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "history" | "suspects">("upload");

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, suspectsRes] = await Promise.all([fetch(`${API}/health`), fetch(`${API}/suspects`)]);
      if (healthRes.ok) {
        const info = await healthRes.json();
        setApiOnline(true);
        setApiInfo(info);
        const { suspects: s } = await suspectsRes.json();
        setSuspects(s);
      } else {
        setApiOnline(false);
      }
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResult = (r: AnalysisResult) => {
    setHistory((prev) => [r, ...prev]);
    setSelectedHistory(r);
    setActiveTab("history");
  };

  const casesForModal = cases.length > 0 ? cases : [{ case_id: "CASE-2024-001", title: "Sample Case" }];
  const stats = {
    total: history.length,
    matched: history.filter((r) => r.match_score >= 75).length,
    confirmed: history.filter((r) => r.match_score >= 92).length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--background)" }}>
      <Navbar />
      <div className="page-layout" style={{ flex: 1 }}>
        <Sidebar />
        <main className="page-main">
          {/* Header */}
          <div className="page-header">
            <div className="page-title">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#c084fc,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🧬</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "var(--text-3xl)" }}>Biometric Analysis Lab</h1>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  Upload real DNA · Fingerprint · Iris · Face · Voice samples for forensic matching
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: apiOnline ? "#10b981" : "#ef4444", display: "inline-block", boxShadow: `0 0 8px ${apiOnline ? "#10b981" : "#ef4444"}` }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {apiOnline ? `API Online · Port 8002 · ${apiInfo?.suspects_in_db ?? 15} suspects` : "API Offline"}
                </span>
              </div>
            </div>
            <div className="page-actions">
              <button className="btn btn-ghost" onClick={fetchData}>🔄 Refresh</button>
            </div>
          </div>

          {!apiOnline && (
            <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
              <span>⚠️</span>
              <div>
                <strong>Biometric API not running.</strong> Start with:{" "}
                <code style={{ background: "rgba(239,68,68,0.15)", padding: "2px 6px", borderRadius: 4 }}>biometric_api\start.bat</code>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Analyses Run", value: stats.total, color: "#c084fc", icon: "🧬" },
              { label: "Matches Found", value: stats.matched, color: "#10b981", icon: "✅" },
              { label: "Match Confirmed", value: stats.confirmed, color: "#00d4ff", icon: "⛓" },
              { label: "Suspects in DB", value: apiInfo?.suspects_in_db ?? 15, color: "#f59e0b", icon: "👤" },
              { label: "Modalities", value: 5, color: "#e94560", icon: "🔬" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 12, right: 14, fontSize: "1.4rem", opacity: 0.25 }}>{s.icon}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>{s.label}</div>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: "1.5rem" }}>
            <button className={`tab${activeTab === "upload" ? " active" : ""}`} onClick={() => setActiveTab("upload")}>📤 Upload and Analyze</button>
            <button className={`tab${activeTab === "history" ? " active" : ""}`} onClick={() => setActiveTab("history")}>
              📋 Results History {history.length > 0 && `(${history.length})`}
            </button>
            <button className={`tab${activeTab === "suspects" ? " active" : ""}`} onClick={() => setActiveTab("suspects")}>
              👤 Suspect Database ({suspects.length})
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg,rgba(192,132,252,0.08),rgba(147,51,234,0.04))", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 14, fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>🔬</span>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Real Biometric Analysis</strong> — Upload actual files for genuine forensic analysis.
                  Gabor ridge extraction, CODIS-15 STR profiling, Daugman IrisCode, HOG face features, and MFCC voice analysis.
                  Matched against a 15-suspect Indian forensic database. Expand any panel below to upload.
                </div>
              </div>
              {MODALITIES.map((config) => (
                <ModalityUploadCard key={config.key} config={config} cases={casesForModal} onResult={handleResult} />
              ))}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "70vh", overflowY: "auto" }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🧬</div>
                    <p style={{ margin: 0 }}>No analyses yet</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }} onClick={() => setActiveTab("upload")}>Upload First Sample</button>
                  </div>
                ) : (
                  history.map((r) => (
                    <HistoryCard key={r.result_id} result={r} active={selectedHistory?.result_id === r.result_id} onClick={() => setSelectedHistory(r)} />
                  ))
                )}
              </div>
              <div>
                {selectedHistory ? (
                  <ResultPanel result={selectedHistory} color={MODALITIES.find((m) => m.label === selectedHistory.modality)?.color ?? "#c084fc"} icon={MODALITIES.find((m) => m.label === selectedHistory.modality)?.icon ?? "🔬"} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "var(--text-muted)", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ fontSize: "4rem" }}>📋</div>
                    <p style={{ fontSize: "var(--text-lg)", fontWeight: 600, margin: 0 }}>Select a result</p>
                    <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>Click an analysis from the left panel</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suspects Tab */}
          {activeTab === "suspects" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>
              {suspects.map((s) => (
                <div key={s.id} style={{ padding: "1.25rem", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#c084fc,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                      {s.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "var(--text-base)", marginBottom: "0.2rem" }}>{s.name}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                        {s.city}, {s.state} · Age {s.age} · {s.gender === "M" ? "Male" : s.gender === "F" ? "Female" : s.gender}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-family-mono)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        {s.aadhaar} · {s.blood_group}
                      </div>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {s.criminal_history.map((h: string) => (
                          <span key={h} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "0.875rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                    <span>{s.id}</span>
                    <span style={{ color: "#c084fc", fontWeight: 600 }}>In Database</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
