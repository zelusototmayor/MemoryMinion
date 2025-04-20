import { useQuery } from "@tanstack/react-query";
import { ContactWithMentionCount } from "@shared/schema";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Skeleton } from "./skeleton";

type ConversationContactBadgesProps = {
  conversationId: number;
};

export function ConversationContactBadges({ conversationId }: ConversationContactBadgesProps) {
  // Fetch contacts mentioned in this conversation
  const { data, isLoading, isError } = useQuery<{ contacts: ContactWithMentionCount[] }>({
    queryKey: [`/api/conversations/${conversationId}/contacts`],
    queryFn: () => fetch(`/api/conversations/${conversationId}/contacts`).then(res => res.json()),
  });

  // Get contact color by ID for visual distinction
  const getContactColor = (contactId: number) => {
    const colors = ["blue", "green", "purple", "yellow", "pink", "orange", "indigo", "teal"];
    return colors[contactId % colors.length];
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    );
  }

  if (isError || !data || !data.contacts || data.contacts.length === 0) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          No contacts
        </span>
      </div>
    );
  }

  // Get top 3 contacts to display 
  const topContacts = data.contacts.slice(0, 3);
  
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {topContacts.map((contact) => {
        const color = getContactColor(contact.id);
        
        return (
          <motion.span
            key={contact.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 * contact.id % 3 }}
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
            <Link href={`/contact/${contact.id}`}>
              {contact.name}
              {contact.mentionCount > 1 && 
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white bg-opacity-30">
                  {contact.mentionCount}
                </span>
              }
            </Link>
          </motion.span>
        );
      })}
      
      {/* Show more if truncated */}
      {data.contacts.length > 3 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          +{data.contacts.length - 3} more
        </span>
      )}
    </div>
  );
}