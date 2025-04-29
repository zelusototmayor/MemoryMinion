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
  // Default values
  let user = null;
  let isLoading = false;
  
  try {
    const auth = useAuthQuery();
    user = auth.user;
    isLoading = auth.isLoading;
  } catch (error) {
    console.error("Auth error:", error);
    return <Redirect to="/auth" />;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return <Component />;
}

// Admin role check
function AdminRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  // Default values
  let user = null;
  let isLoading = false;
  
  try {
    const auth = useAuthQuery();
    user = auth.user;
    isLoading = auth.isLoading;
  } catch (error) {
    console.error("Auth error:", error);
    return <Redirect to="/auth" />;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Check if user has admin role
  if (user.role !== 'admin') {
    return <Redirect to="/" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <Route path="/" component={() => <ProtectedRoute component={HomePage} path="/" />} />
      <Route path="/contact/:id" component={() => <ProtectedRoute component={ContactDetailPage} path="/contact/:id" />} />
      <Route path="/timeline" component={() => <ProtectedRoute component={TimelinePage} path="/timeline" />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} path="/calendar" />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={TasksPage} path="/tasks" />} />
      
      {/* Admin routes */}
      <Route path="/admin/users" component={() => <AdminRoute component={AdminUsersPage} path="/admin/users" />} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
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
