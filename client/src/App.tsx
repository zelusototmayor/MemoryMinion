import React from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ContactDetailPage from "@/pages/contact-detail";
import TimelinePage from "@/pages/timeline";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import AdminUsersPage from "@/pages/admin-users";

function Router() {
  return (
    <Switch>
      {/* All routes are public now */}
      <Route path="/" component={HomePage} />
      <Route path="/contact/:id" component={ContactDetailPage} />
      <Route path="/timeline" component={TimelinePage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      
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
