import { useLocation } from "wouter";
import ConversationsPage from "./conversations";
import ContactsPage from "./contacts";
import TimelinePage from "./timeline";
import { useState } from "react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"conversations" | "contacts" | "timeline">("conversations");
  const [, navigate] = useLocation();
  
  const handleNewConversation = async () => {
    // This will be handled in the conversations component
    const conversationsTab = document.getElementById('conversations-tab');
    if (conversationsTab) {
      conversationsTab.click();
    }
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
                id="conversations-tab"
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "conversations" 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab("conversations")}
              >
                <span className="material-icons text-sm mr-1">chat</span>
                Conversations
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
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "conversations" ? (
          <ConversationsPage />
        ) : activeTab === "contacts" ? (
          <ContactsPage />
        ) : (
          <TimelinePage />
        )}
      </div>
    </div>
  );
}
