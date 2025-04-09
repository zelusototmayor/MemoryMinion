import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { ConversationWithLastMessage } from "@shared/schema";

export function ConversationsSidebar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<{ conversations: ConversationWithLastMessage[] }>({
    queryKey: ["/api/conversations"],
    queryFn: () => fetch("/api/conversations").then((res) => res.json()),
  });

  const handleNewConversation = async () => {
    try {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation",
        user_id: user?.id
      });
      
      if (!response.ok) throw new Error("Failed to create conversation");
      
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const renderConversationItem = (conversation: ConversationWithLastMessage) => {
    const lastMessageDate = conversation.lastMessage?.created_at 
      ? new Date(conversation.lastMessage.created_at) 
      : null;
    
    const conversationDate = conversation.created_at 
      ? new Date(conversation.created_at) 
      : new Date();
      
    const timeAgo = formatDistanceToNow(
      lastMessageDate || conversationDate, 
      { addSuffix: true }
    );
    
    return (
      <div 
        key={conversation.id} 
        className="conversation-item mb-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition duration-150 cursor-pointer p-3"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{conversation.title}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
          {conversation.lastMessage?.content || 'New conversation'}
        </p>
      </div>
    );
  };

  const renderConversationList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-md border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      );
    }
    
    if (isError) {
      return (
        <div className="p-3 text-center">
          <p className="text-red-500 text-xs">Failed to load conversations.</p>
        </div>
      );
    }
    
    if (!data?.conversations || data.conversations.length === 0) {
      return (
        <div className="p-3 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs">No conversations yet.</p>
        </div>
      );
    }
    
    return (
      <div className="p-3 space-y-2">
        {data.conversations.map(renderConversationItem)}
      </div>
    );
  };
  
  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-medium text-sm text-gray-900 dark:text-white">Conversations</h2>
        <button 
          onClick={handleNewConversation}
          className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center"
        >
          <span className="material-icons text-[14px] mr-1">add</span>
          New
        </button>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
        {renderConversationList()}
      </div>
    </div>
  );
}