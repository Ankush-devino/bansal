import "./global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/hero.css";
import "./styles/dashboard.css";

import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ForensicProvider } from "./hooks/useForensicStore";

// Lazy-load all pages so a crash in one doesn't affect the whole app
// and the initial JS bundle is much smaller / faster to parse
const Index             = lazy(() => import("./pages/Index"));
const NotFound          = lazy(() => import("./pages/NotFound"));
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Cases             = lazy(() => import("./pages/Cases"));
const Evidence          = lazy(() => import("./pages/Evidence"));
const Assignment        = lazy(() => import("./pages/Assignment"));
const Biometric         = lazy(() => import("./pages/Biometric"));
const Reports           = lazy(() => import("./pages/Reports"));
const AuditTrail        = lazy(() => import("./pages/AuditTrail"));
const Collaboration     = lazy(() => import("./pages/Collaboration"));
const CrimeScene        = lazy(() => import("./pages/CrimeScene"));
const DeepfakeDetection = lazy(() => import("./pages/DeepfakeDetection"));

// Simple full-screen loading spinner shown while a page chunk loads
const PageLoader = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0f1e",
      color: "#00d4ff",
      fontFamily: "Inter, sans-serif",
      flexDirection: "column",
      gap: "1rem",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        border: "3px solid rgba(0,212,255,0.2)",
        borderTopColor: "#00d4ff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <span style={{ fontSize: "0.9rem", opacity: 0.7 }}>Loading…</span>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      {/*
        ForensicProvider wraps every page with a shared live data store.
        Cases, Evidence, Collaboration, Audit Trail, and Assignment all
        subscribe to the same state — creating a case or uploading evidence
        is instantly reflected everywhere without separate fetch calls.
      */}
      <ForensicProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                   element={<Index />} />
            <Route path="/dashboard"          element={<Dashboard />} />
            <Route path="/cases"              element={<Cases />} />
            <Route path="/evidence"           element={<Evidence />} />
            <Route path="/assignment"         element={<Assignment />} />
            <Route path="/biometric"          element={<Biometric />} />
            <Route path="/reports"            element={<Reports />} />
            <Route path="/audit"              element={<AuditTrail />} />
            <Route path="/collaboration"      element={<Collaboration />} />
            <Route path="/crime-scene"        element={<CrimeScene />} />
            <Route path="/deepfake-detection" element={<DeepfakeDetection />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*"                   element={<NotFound />} />
          </Routes>
        </Suspense>
      </ForensicProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
