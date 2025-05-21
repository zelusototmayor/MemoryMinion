import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/mobile.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { SupabaseAuthProvider } from "./hooks/use-supabase-auth";
import { Toaster } from "./components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <App />
      <Toaster />
    </SupabaseAuthProvider>
  </QueryClientProvider>
);
