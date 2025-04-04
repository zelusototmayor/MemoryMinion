import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ConversationsPage from "@/pages/conversations";
import ChatPage from "@/pages/chat";
import ContactsPage from "@/pages/contacts";
import ContactDetailPage from "@/pages/contact-detail";

function Router() {
  // Skip authentication check for now
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
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
