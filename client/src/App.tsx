import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import ConversationsPage from "@/pages/conversations";
import ChatPage from "@/pages/chat";
import ContactsPage from "@/pages/contacts";
import ContactDetailPage from "@/pages/contact-detail";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If no user is logged in, only show the auth page
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }
  
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/conversation/:id" component={ChatPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/contact/:id" component={ContactDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
