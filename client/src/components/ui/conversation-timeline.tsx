import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ConversationWithLastMessage, ContactWithMentionCount } from "@shared/schema";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ConversationContactBadges } from "./conversation-contact-badges";

type ConversationTimelineProps = {
  conversations: ConversationWithLastMessage[];
  contacts?: ContactWithMentionCount[];
  className?: string;
};

export function ConversationTimeline({ 
  conversations, 
  contacts = [],
  className 
}: ConversationTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Sort conversations by date, ensuring we have a valid array
  const conversationsArray = Array.isArray(conversations) ? conversations : [];
  const sortedConversations = [...conversationsArray].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  // Group conversations by month
  const groupedConversations: Record<string, ConversationWithLastMessage[]> = {};
  sortedConversations.forEach(conversation => {
    const date = conversation.created_at ? new Date(conversation.created_at) : new Date();
    const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!groupedConversations[month]) {
      groupedConversations[month] = [];
    }
    
    groupedConversations[month].push(conversation);
  });

  // Helper to format month labels
  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  // For staggered animation
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  // Get contact color by ID
  const getContactColor = (contactId: number) => {
    const colors = ["blue", "green", "purple", "yellow", "pink", "orange", "indigo", "teal"];
    return colors[contactId % colors.length];
  };

  return (
    <div 
      ref={timelineRef}
      className={cn("w-full", className)}
    >
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
        
        {/* Timeline entries */}
        <div className="pl-12 relative z-10">
          {Object.entries(groupedConversations).map(([month, monthConversations], monthIndex) => (
            <div key={month} className="mb-8">
              {/* Month heading */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: monthIndex * 0.1 }}
                className="text-md font-semibold text-gray-800 dark:text-gray-300 mb-4"
              >
                {formatMonthLabel(month)}
              </motion.div>
              
              {/* Conversations for this month */}
              <div className="space-y-4">
                {monthConversations.map((conversation, convIndex) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ 
                      delay: (monthIndex * 0.1) + (convIndex * 0.05),
                      type: "spring",
                      stiffness: 260,
                      damping: 20
                    }}
                    whileHover={{ scale: 1.02 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-12 mt-1.5 w-4 h-4 rounded-full bg-primary"></div>
                    
                    {/* Conversation card */}
                    <Link href={`/conversation/${conversation.id}`} className="block bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {conversation.title}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.created_at ? 
                            formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true }) : 
                            "Date unknown"}
                        </span>
                      </div>
                      
                      {/* Last message preview */}
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      
                      {/* Contact badges (if present in the conversation) */}
                      {conversation.contactCount && conversation.contactCount > 0 ? (
                        <ConversationContactBadges conversationId={conversation.id} />
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            No contacts mentioned
                          </span>
                        </div>
                      )}
                      
                      {/* Activity indicator */}
                      <motion.div 
                        className="h-1 bg-primary-100 dark:bg-primary-900 rounded-full mt-3"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (conversation.id * 15) % 100)}%` }}
                        transition={{ duration: 1, delay: (monthIndex * 0.1) + (convIndex * 0.05) + 0.3 }}
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Empty state */}
          {Object.keys(groupedConversations).length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-24 w-24 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="material-icons text-gray-300 text-4xl">timeline</span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                Start a new conversation to see your timeline visualized here.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}