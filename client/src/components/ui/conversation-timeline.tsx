import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ConversationWithLastMessage, ContactWithMentionCount } from "@shared/schema";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
      className={cn("w-full p-4", className)}
    >
      <div className="flex flex-col mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Conversation Timeline
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Visualize your conversation history
        </p>
      </div>
      
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
                      {Array.isArray(contacts) && contacts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {contacts
                            .filter(contact => {
                              // This is a placeholder - in a real implementation, we'd need to
                              // query which contacts are mentioned in this conversation
                              return Math.random() > 0.5; // Just for demo
                            })
                            .slice(0, 3)
                            .map((contact) => {
                              const color = getContactColor(contact.id);
                              
                              return (
                                <motion.span
                                  key={contact.id}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.2 + (0.1 * contact.id) }}
                                  className={cn(
                                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                    color === "blue" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                                    color === "green" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                                    color === "purple" && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                                    color === "yellow" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
                                    color === "pink" && "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                                    color === "orange" && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
                                    color === "indigo" && "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
                                    color === "teal" && "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                                  )}
                                >
                                  {contact.name}
                                </motion.span>
                              );
                            })}
                          {/* Show more if truncated */}
                          {Array.isArray(contacts) && contacts.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              +{contacts.length - 3} more
                            </span>
                          )}
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
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="material-icons text-gray-400 text-3xl">timeline</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
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