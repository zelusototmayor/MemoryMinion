import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";
import ContactDetailPage from "@/pages/contact-detail";

function Router() {
  // Skip authentication check for now
  return (
    <Switch>
      {/* Make homepage the default page with tabs */}
      <Route path="/" component={HomePage} />
      <Route path="/conversation/:id" component={ChatPage} />
      <Route path="/contact/:id" component={ContactDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return <Router />;
}

export default App;
