import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type ConversationWithLastMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data, isLoading, isError } = useQuery<{ conversations: ConversationWithLastMessage[] }>({
    queryKey: ["/api/conversations", { userId: user?.id }],
    queryFn: () => fetch(`/api/conversations?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user
  });
  
  const handleNewConversation = async () => {
    if (!user) return;
    
    try {
      const response = await apiRequest('POST', '/api/conversations', {
        user_id: user.id,
        title: "New Conversation"
      });
      
      const { conversation } = await response.json();
      navigate(`/conversation/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  if (!user) return null;
  
  const renderEmptyState = () => (
    <div className="h-full flex items-center justify-center p-6 text-center">
      <div>
        <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
          <span className="material-icons text-5xl text-primary">chat</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No conversations yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Start a new conversation with RevocAI to get assistance</p>
        <button 
          onClick={handleNewConversation}
          className="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-600 transition duration-200"
        >
          New Conversation
        </button>
      </div>
    </div>
  );
  
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
      <div key={conversation.id} className="conversation-item border-b border-gray-200 dark:border-gray-700">
        <div
          onClick={() => navigate(`/conversation/${conversation.id}`)}
          className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition duration-150 cursor-pointer"
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{conversation.title}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {conversation.lastMessage?.content || 'Start a new conversation'}
          </p>
          <div className="flex items-center">
            <div className="flex -space-x-2 mr-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs text-blue-600 dark:text-blue-300 border border-white dark:border-gray-800">
                {user.displayName?.charAt(0)}
              </div>
              <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs text-green-600 dark:text-green-300 border border-white dark:border-gray-800">
                AI
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {conversation.contactCount ? `${conversation.contactCount} contacts mentioned` : 'No contacts yet'}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderConversationList = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex items-center">
                <Skeleton className="h-6 w-6 rounded-full mr-1" />
                <Skeleton className="h-6 w-6 rounded-full mr-2" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (isError) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-500">Failed to load conversations.</p>
          <button 
            className="mt-2 text-primary hover:underline"
            onClick={() => handleNewConversation()}
          >
            Start a new conversation
          </button>
        </div>
      );
    }
    
    if (!data?.conversations || data.conversations.length === 0) {
      return renderEmptyState();
    }
    
    return data.conversations.map(renderConversationItem);
  };
  
  return (
    <div className="flex-1 overflow-y-auto pb-16">
      {renderConversationList()}
    </div>
  );
}
