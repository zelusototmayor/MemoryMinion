import { useLocation } from "wouter";
import ContactsPage from "./contacts";
import TimelinePage from "./timeline";
import CalendarPage from "./calendar";
import TasksPage from "./tasks";
import { useState } from "react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { ActiveConversation } from "@/components/active-conversation";
import { ConversationsSidebar } from "@/components/conversations-sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"chat" | "contacts" | "timeline" | "calendar" | "tasks">("chat");
  const [showSidebar, setShowSidebar] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const handleNewConversation = async () => {
    try {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation",
        user_id: user?.id
      });
      
      if (!response.ok) throw new Error("Failed to create conversation");
      
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Ensure chat tab is active
      setActiveTab("chat");
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };
  
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      
      {/* ChatGPT-style Header with tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex space-x-4">
              <button 
                onClick={toggleSidebar}
                className="mr-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                title="Toggle conversations sidebar"
              >
                <span className="material-icons">menu</span>
              </button>
              
              <button 
                id="chat-tab"
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "chat" 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab("chat")}
              >
                <span className="material-icons text-sm mr-1">chat</span>
                Chat
              </button>
              <button 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "contacts" 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab("contacts")}
              >
                <span className="material-icons text-sm mr-1">contacts</span>
                Contacts
              </button>
              <button 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "timeline" 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab("timeline")}
              >
                <span className="material-icons text-sm mr-1">timeline</span>
                Timeline
              </button>
              <button 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "calendar" 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab("calendar")}
              >
                <span className="material-icons text-sm mr-1">calendar_month</span>
                Calendar
              </button>
              <button 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "tasks" 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab("tasks")}
              >
                <span className="material-icons text-sm mr-1">task</span>
                Tasks
              </button>
            </div>
            
            <div>
              <Button 
                onClick={handleNewConversation}
                className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium flex items-center"
                size="sm"
              >
                <span className="material-icons text-sm mr-1">add</span>
                New Chat
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only visible when showSidebar is true */}
        {showSidebar && (
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
            <ConversationsSidebar />
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "chat" ? (
            <ActiveConversation />
          ) : activeTab === "contacts" ? (
            <ContactsPage />
          ) : activeTab === "timeline" ? (
            <TimelinePage />
          ) : activeTab === "calendar" ? (
            <CalendarPage />
          ) : (
            <TasksPage />
          )}
        </div>
      </div>
    </div>
  );
}
