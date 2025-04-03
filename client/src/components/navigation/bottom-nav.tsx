import { useLocation } from "wouter";

type BottomNavProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [, navigate] = useLocation();
  
  const handleNewConversation = async () => {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: 1, // Would come from auth context in production
        title: "New Conversation",
      }),
    });
    
    if (response.ok) {
      const { conversation } = await response.json();
      navigate(`/conversation/${conversation.id}`);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex justify-around">
        <button
          className={`flex flex-col items-center justify-center py-2 px-4 flex-1 ${
            activeTab === "conversations" ? "text-primary" : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={() => onTabChange("conversations")}
        >
          <span className="material-icons">chat</span>
          <span className="text-xs mt-1">Chats</span>
        </button>
        
        <button
          className={`flex flex-col items-center justify-center py-2 px-4 flex-1 ${
            activeTab === "contacts" ? "text-primary" : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={() => onTabChange("contacts")}
        >
          <span className="material-icons">people</span>
          <span className="text-xs mt-1">Contacts</span>
        </button>
        
        <div className="flex items-center justify-center px-4">
          <button
            className="h-12 w-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg -mt-6 hover:bg-primary-600 transition duration-200"
            onClick={handleNewConversation}
          >
            <span className="material-icons">add</span>
          </button>
        </div>
        
        <button
          className="flex flex-col items-center justify-center py-2 px-4 flex-1 text-gray-500 dark:text-gray-400"
          onClick={() => {}}
        >
          <span className="material-icons">search</span>
          <span className="text-xs mt-1">Search</span>
        </button>
        
        <button
          className="flex flex-col items-center justify-center py-2 px-4 flex-1 text-gray-500 dark:text-gray-400"
          onClick={() => {}}
        >
          <span className="material-icons">settings</span>
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
}
