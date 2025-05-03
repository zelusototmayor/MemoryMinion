import React, { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ContactDetailPage from "@/pages/contact-detail";
import TimelinePage from "@/pages/timeline";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import AuthPage from "@/pages/auth";
import AdminUsersPage from "@/pages/admin-users";
import { useAuthQuery } from "@/hooks/use-auth-query";
import { Loader2 } from "lucide-react";

// Protected route component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const auth = useAuthQuery();
  const { user, isLoading } = auth;
  const [isChecking, setIsChecking] = useState(true);
  const [localUser, setLocalUser] = useState<any>(null);
  
  useEffect(() => {
    // Try to load from localStorage first
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setLocalUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error loading user from localStorage:", e);
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  console.log("ProtectedRoute - User:", user, "LocalUser:", localUser, "isLoading:", isLoading, "isChecking:", isChecking);
  
  // Show loader while we're loading from API or checking localStorage
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Use either the user from the API or from localStorage
  const authenticatedUser = user || localUser;
  
  if (!authenticatedUser) {
    console.log("No user found (in API or localStorage), redirecting to /auth");
    return <Redirect to="/auth" />;
  }
  
  console.log("User authenticated, rendering component");
  return <Component />;
}

// Admin role check
function AdminRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const auth = useAuthQuery();
  const { user, isLoading } = auth;
  const [isChecking, setIsChecking] = useState(true);
  const [localUser, setLocalUser] = useState<any>(null);
  
  useEffect(() => {
    // Try to load from localStorage first
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setLocalUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error loading user from localStorage:", e);
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  console.log("AdminRoute - User:", user, "LocalUser:", localUser, "isLoading:", isLoading, "isChecking:", isChecking);
  
  // Show loader while we're loading from API or checking localStorage
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Use either the user from the API or from localStorage
  const authenticatedUser = user || localUser;
  
  if (!authenticatedUser) {
    console.log("No user found (in API or localStorage), redirecting to /auth");
    return <Redirect to="/auth" />;
  }
  
  // Check if user has admin role
  if (authenticatedUser.role !== 'admin') {
    console.log("User is not admin, redirecting to home");
    return <Redirect to="/" />;
  }
  
  console.log("Admin user authenticated, rendering component");
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <Route path="/" component={() => <ProtectedRoute component={HomePage} path="/" />} />
      <Route path="/contact/:id" component={() => <ProtectedRoute component={ContactDetailPage} path="/contact/:id" />} />
      <Route path="/timeline" component={() => <ProtectedRoute component={TimelinePage} path="/timeline" />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} path="/calendar" />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={TasksPage} path="/tasks" />} />
      
      {/* Admin routes */}
      <Route path="/admin/users" component={() => <AdminRoute component={AdminUsersPage} path="/admin/users" />} />
      
      {/* Catch-all route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
