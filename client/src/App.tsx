import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ConversationsPage from "@/pages/conversations";
import ChatPage from "@/pages/chat";
import ContactsPage from "@/pages/contacts";
import ContactDetailPage from "@/pages/contact-detail";
import TimelinePage from "@/pages/timeline";

function Router() {
  // Skip authentication check for now
  return (
    <Switch>
      {/* Redirect root to conversations page */}
      <Route path="/">
        <Redirect to="/conversations" />
      </Route>
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/conversation/:id" component={ChatPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/contact/:id" component={ContactDetailPage} />
      <Route path="/timeline" component={TimelinePage} />
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
