import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Contact, Message } from "@shared/schema";

export default function ContactDetailPage() {
  const [match, params] = useRoute<{ id: string }>("/contact/:id");
  const [, navigate] = useLocation();
  const contactId = match && params ? parseInt(params.id) : null;

  const { data, isLoading, isError } = useQuery<{
    contact: Contact;
    messages: Message[];
  }>({
    queryKey: ["/api/contacts", contactId],
    queryFn: () => fetch(`/api/contacts/${contactId}`).then((res) => res.json()),
    enabled: contactId !== null,
  });

  // Color generation based on contact name
  const getContactColor = (name: string) => {
    const colors = ["blue", "green", "purple", "yellow", "pink", "orange", "indigo", "teal"];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Handle back button click
  const handleBack = () => {
    navigate("/");
  };

  // Handle view in conversation button click
  const handleViewInConversation = (messageId: number, conversationId: number) => {
    navigate(`/conversation/${conversationId}`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-20 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button className="mr-2 text-gray-600 dark:text-gray-300">
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 className="font-medium text-lg text-gray-900 dark:text-white">Contact Details</h2>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-5">
            <div className="flex flex-col items-center mb-4">
              <Skeleton className="h-20 w-20 rounded-full mb-2" />
              <Skeleton className="h-6 w-40 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full mb-3 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-20 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={handleBack} className="mr-2 text-gray-600 dark:text-gray-300">
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 className="font-medium text-lg text-gray-900 dark:text-white">Error</h2>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load contact details.</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const { contact, messages } = data;
  const color = getContactColor(contact.name);
  const initial = contact.name.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-20 flex flex-col">
      {/* Contact detail header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            id="back-from-contact-button"
            className="mr-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            onClick={handleBack}
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <h2 className="font-medium text-lg text-gray-900 dark:text-white">Contact Details</h2>
        </div>
        <div>
          <button
            id="contact-edit-button"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <span className="material-icons">edit</span>
          </button>
        </div>
      </header>

      {/* Contact detail content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Contact profile */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-5">
          <div className="flex flex-col items-center mb-4">
            <div
              className={`h-20 w-20 rounded-full bg-${color}-100 dark:bg-${color}-900 flex items-center justify-center text-${color}-600 dark:text-${color}-300 text-3xl mb-2`}
            >
              {initial}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {contact.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {contact.notes || "No additional information"}
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Notes
                </h4>
                <p className="text-sm text-gray-900 dark:text-white">
                  {contact.notes || "No notes available."}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Recent Activity
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mentioned in {messages.length} {messages.length === 1 ? "conversation" : "conversations"} in the last 30 days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent conversation mentions */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Mentions</h3>
            {messages.length > 5 && (
              <button className="text-xs text-primary hover:text-primary-600 font-medium">
                See All
              </button>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No mentions found</p>
            </div>
          ) : (
            messages.slice(0, 5).map((message) => (
              <div
                key={message.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Conversation #{message.conversation_id}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                  "{message.content}"
                </p>
                <div className="flex justify-end">
                  <button
                    className="text-xs text-primary hover:text-primary-600 font-medium"
                    onClick={() => handleViewInConversation(message.id, message.conversation_id)}
                  >
                    View in Conversation
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
