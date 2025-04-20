import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ContactDetailPage from "@/pages/contact-detail";
import TimelinePage from "@/pages/timeline";

function Router() {
  // Skip authentication check for now
  return (
    <Switch>
      {/* Make homepage the default page with integrated chat */}
      <Route path="/" component={HomePage} />
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
