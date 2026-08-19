import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "localhost",
    port: 3000,
    open: true,
    // Eagerly transform entry files so first page load is instant
    warmup: {
      clientFiles: [
        "./client/App.tsx",
        "./client/pages/Index.tsx",
        "./client/pages/Dashboard.tsx",
        "./client/components/layout/Sidebar.tsx",
        "./client/components/layout/Navbar.tsx",
      ],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  // Pre-bundle heavy deps so startup is fast after the first run
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "lucide-react",
      "@tanstack/react-query",
      "recharts",
    ],
  },
}));
