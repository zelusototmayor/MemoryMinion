import React from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { SupabaseAuthProvider } from "@/hooks/use-supabase-auth";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ContactDetailPage from "@/pages/contact-detail";
import TimelinePage from "@/pages/timeline";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import AdminUsersPage from "@/pages/admin-users";
import AuthPage from "@/pages/auth-page";

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/contact/:id" component={ContactDetailPage} />
      <ProtectedRoute path="/timeline" component={TimelinePage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/admin/users" component={AdminUsersPage} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Catch-all route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <SupabaseAuthProvider>
      <Router />
      <Toaster />
    </SupabaseAuthProvider>
  );
}

export default App;
