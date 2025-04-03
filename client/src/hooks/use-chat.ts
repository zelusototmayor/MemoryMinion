import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { Message, PotentialContact } from "@shared/schema";

export function useChat(conversationId: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [detectedContacts, setDetectedContacts] = useState<PotentialContact[]>([]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !conversationId) return null;
      
      const response = await apiRequest("POST", "/api/messages", {
        conversation_id: conversationId,
        sender: "user",
        content: content,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // If we have detected contacts, show them to the user
      if (data?.potentialContacts && data.potentialContacts.length > 0) {
        setDetectedContacts(data.potentialContacts);
      }
      
      // Invalidate conversation messages to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (contact: { user_id: number; name: string; notes?: string }) => {
      return apiRequest("POST", "/api/contacts", contact).then((res) => res.json());
    },
    onSuccess: (data, variables) => {
      // After creating a contact, create the contact link if we have a message
      if (data?.contact && data.contact.id) {
        // Find the message that mentioned this contact
        const mentionedIn = data.messages?.find((msg: Message) => 
          msg.content.toLowerCase().includes(variables.name.toLowerCase())
        );
        
        if (mentionedIn) {
          createContactLinkMutation.mutate({
            contact_id: data.contact.id,
            message_id: mentionedIn.id,
            relationship: "mentioned"
          });
        }
      }
      
      // Clear detected contacts for this name
      setDetectedContacts(prevContacts => 
        prevContacts.filter(c => c.name !== variables.name)
      );
    }
  });
  
  const createContactLinkMutation = useMutation({
    mutationFn: async (link: { contact_id: number; message_id: number; relationship: string }) => {
      return apiRequest("POST", "/api/contact-links", link).then((res) => res.json());
    }
  });

  return {
    sendMessage: sendMessageMutation.mutateAsync,
    createContact: createContactMutation.mutateAsync,
    detectedContacts,
    clearContact: (name: string) => {
      setDetectedContacts(prevContacts => 
        prevContacts.filter(c => c.name !== name)
      );
    },
    isLoading: sendMessageMutation.isPending || createContactMutation.isPending,
  };
}
