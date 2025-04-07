import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConversationWithLastMessage, ContactWithMentionCount } from "@shared/schema";
import { ConversationTimeline } from "@/components/ui/conversation-timeline";
import Header from "@/components/header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { useState } from "react";

export default function TimelinePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("timeline");
  
  // Fetch conversations
  const { 
    data: conversations, 
    isLoading: isLoadingConversations, 
    isError: isErrorConversations 
  } = useQuery<ConversationWithLastMessage[]>({
    queryKey: ["/api/conversations"],
    queryFn: () => fetch("/api/conversations").then((res) => res.json()),
  });
  
  // Fetch popular contacts
  const { 
    data: contacts, 
    isLoading: isLoadingContacts 
  } = useQuery<ContactWithMentionCount[]>({
    queryKey: ["/api/contacts/frequent"],
    queryFn: () => fetch("/api/contacts/frequent").then((res) => res.json()),
  });
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Conversation Timeline
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="hidden sm:flex"
          >
            <span className="material-icons text-sm mr-1">arrow_back</span>
            Back
          </Button>
        </div>
        
        {isLoadingConversations || isLoadingContacts ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
            
            {/* Timeline skeleton */}
            <div className="pl-12 relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-8">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <div className="space-y-4">
                    {[1, 2].map((j) => (
                      <div key={j} className="relative">
                        <div className="absolute -left-12 mt-1.5 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isErrorConversations ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">Failed to load timeline data.</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : (
          <ConversationTimeline 
            conversations={conversations || []} 
            contacts={contacts || []}
          />
        )}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}