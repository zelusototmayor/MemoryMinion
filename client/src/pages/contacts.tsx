import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ContactWithMentionCount } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function ContactsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data: frequentContacts, isLoading: isLoadingFrequent } = useQuery<{ contacts: ContactWithMentionCount[] }>({
    queryKey: ["/api/contacts/frequent", { userId: user?.id }],
    queryFn: () => fetch(`/api/contacts/frequent?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user
  });
  
  const { data: allContacts, isLoading: isLoadingAll } = useQuery<{ contacts: ContactWithMentionCount[] }>({
    queryKey: ["/api/contacts", { userId: user?.id }],
    queryFn: () => fetch(`/api/contacts?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user
  });
  
  const handleContactClick = (contactId: number) => {
    navigate(`/contact/${contactId}`);
  };
  
  // Function to generate a color based on contact name
  const getContactColor = (name: string) => {
    const colors = [
      "blue", "green", "purple", "yellow", "pink", "orange", "indigo", "teal"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  // Function to render the contact avatar with appropriate color
  const renderContactAvatar = (name: string, size: "sm" | "lg" = "sm") => {
    const color = getContactColor(name);
    const initial = name.charAt(0).toUpperCase();
    
    const sizeClasses = size === "lg" 
      ? "h-14 w-14 text-xl" 
      : "h-10 w-10 text-sm";
    
    return (
      <div className={`${sizeClasses} rounded-full bg-${color}-100 dark:bg-${color}-900 flex items-center justify-center text-${color}-600 dark:text-${color}-300 ${size === "lg" ? "mb-1" : "mr-3"}`}>
        {initial}
      </div>
    );
  };
  
  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto pb-16">
      <div className="p-4 grid grid-cols-1 gap-4">
        {/* Frequent Contacts Section */}
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 pt-1 pb-2 z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Frequent Contacts</h3>
          </div>
        </div>
        
        {/* Frequent Contacts Grid */}
        <div className="grid grid-cols-4 gap-4">
          {isLoadingFrequent ? (
            // Skeleton loaders for frequent contacts
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="h-14 w-14 rounded-full mb-1" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))
          ) : frequentContacts?.contacts && frequentContacts.contacts.length > 0 ? (
            // Render frequent contacts
            frequentContacts.contacts.map(contact => (
              <div 
                key={contact.id} 
                className="flex flex-col items-center cursor-pointer"
                onClick={() => handleContactClick(contact.id)}
              >
                {renderContactAvatar(contact.name, "lg")}
                <span className="text-xs text-gray-900 dark:text-white text-center">{contact.name}</span>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">No frequent contacts yet</p>
            </div>
          )}
        </div>
        
        {/* All Contacts Section */}
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 pt-3 pb-2 z-10 mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">All Contacts</h3>
          </div>
        </div>
        
        {/* All Contacts List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {isLoadingAll ? (
            // Skeleton loaders for all contacts
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))
          ) : allContacts?.contacts && allContacts.contacts.length > 0 ? (
            // Render all contacts
            allContacts.contacts.map((contact, index) => (
              <div 
                key={contact.id} 
                className={`${index < allContacts.contacts.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
              >
                <div 
                  className="flex items-center p-4 cursor-pointer"
                  onClick={() => handleContactClick(contact.id)}
                >
                  {renderContactAvatar(contact.name)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{contact.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{contact.notes || 'No additional information'}</p>
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full mr-2">
                      {contact.mentionCount} {contact.mentionCount === 1 ? 'mention' : 'mentions'}
                    </span>
                    <button>
                      <span className="material-icons text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No contacts found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Contacts will be automatically created when you mention names in conversations
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
