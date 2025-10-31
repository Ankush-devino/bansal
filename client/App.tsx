import "./global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/hero.css";
import "./styles/dashboard.css";

import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import Evidence from "./pages/Evidence";
import Assignment from "./pages/Assignment";
import Biometric from "./pages/Biometric";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Collaboration from "./pages/Collaboration";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/cases" element={<Cases />} />
      <Route path="/evidence" element={<Evidence />} />
      <Route path="/assignment" element={<Assignment />} />
      <Route path="/biometric" element={<Biometric />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/audit" element={<Audit />} />
      <Route path="/collaboration" element={<Collaboration />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

createRoot(document.getElementById("root")!).render(<App />);
