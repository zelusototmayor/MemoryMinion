import { useLocation } from "wouter";
import { BottomNav } from "@/components/navigation/bottom-nav";
import ConversationsPage from "./conversations";
import ContactsPage from "./contacts";
import { useState } from "react";
import Header from "@/components/header";

// Create a mock user for development
const mockUser = {
  id: 1,
  email: "user@example.com",
  displayName: "Test User",
  created_at: new Date()
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"conversations" | "contacts">("conversations");
  
  return (
    <div className="h-screen flex flex-col">
      <Header />
      
      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 px-1 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          <button 
            className={`flex-1 text-center py-3 font-medium ${
              activeTab === "conversations" 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("conversations")}
          >
            Conversations
          </button>
          <button 
            className={`flex-1 text-center py-3 font-medium ${
              activeTab === "contacts" 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("contacts")}
          >
            Contacts
          </button>
        </nav>
      </div>
      
      {/* Content Area */}
      {activeTab === "conversations" ? <ConversationsPage /> : <ContactsPage />}
      
      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as "conversations" | "contacts")} />
    </div>
  );
}
