import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/components/ui/message-bubble";
import { VoiceRecorder } from "@/components/ui/voice-recorder";
import { ContactPrompt } from "@/components/ui/contact-prompt";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { TranscriptionProcessing } from "@/components/transcription-processing";
import { TranscriptionConfirmation } from "@/components/transcription-confirmation";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { formatRelative } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Conversation, Message, MessageWithContactLinks, PotentialContact } from "@shared/schema";

export function ActiveConversation() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState("");
  const [detectedContacts, setDetectedContacts] = useState<PotentialContact[]>([]);

  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    recordingTime,
    resetRecording,
  } = useVoiceRecorder();

  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "idle" | "processing" | "confirm" | "sending"
  >("idle");
  const [transcribedText, setTranscribedText] = useState("");

  // Fetch conversations first to get the most recent
  const conversationsQuery = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["/api/conversations"],
    queryFn: () => fetch("/api/conversations").then((res) => res.json()),
  });

  // Get the most recent conversation from the list
  const mostRecentConversation = conversationsQuery.data?.conversations?.[0];
  const conversationId = mostRecentConversation?.id;

  // Then fetch the active conversation with messages if we have a conversation ID
  const { data, isLoading, isError } = useQuery<{
    conversation: Conversation;
    messages: MessageWithContactLinks[];
  }>({
    queryKey: ["/api/conversations", conversationId],
    queryFn: () => fetch(`/api/conversations/${conversationId}`).then((res) => res.json()),
    enabled: !!conversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !conversationId) {
        // If no conversation exists, create one first
        if (!conversationId) {
          const newConvResponse = await apiRequest("POST", "/api/conversations", {
            title: "New Conversation",
            user_id: user?.id
          });
          
          if (!newConvResponse.ok) {
            throw new Error("Failed to create conversation");
          }
          
          const newConvData = await newConvResponse.json();
          const newId = newConvData.conversation.id;
          
          // Now send the message to the new conversation
          const msgResponse = await apiRequest("POST", "/api/messages", {
            conversation_id: newId,
            sender: "user",
            content: content,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          return msgResponse.json();
        }
        
        return null;
      }

      const response = await apiRequest("POST", "/api/messages", {
        conversation_id: conversationId,
        sender: "user",
        content: content,
      });

      return response.json();
    },
    onSuccess: (data) => {
      setMessage("");

      // If we have detected contacts, show them to the user
      if (data?.potentialContacts && data.potentialContacts.length > 0) {
        setDetectedContacts(data.potentialContacts);
      }

      // Invalidate conversation messages to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
  
  // Title generation mutation
  const generateTitleMutation = useMutation({
    mutationFn: async () => {
      if (!data?.messages || data.messages.length === 0) {
        throw new Error("No messages available to generate title");
      }
      
      const response = await apiRequest("POST", "/api/generate-title", {
        messages: data.messages.map(m => ({
          sender: m.sender,
          content: m.content
        }))
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.title && conversationId) {
        // Update the conversation title
        updateConversationTitleMutation.mutate({
          id: conversationId,
          title: data.title
        });
      }
    }
  });
  
  // Mutation to update conversation title
  const updateConversationTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      return apiRequest("PUT", `/api/conversations/${id}`, { title }).then(res => res.json());
    },
    onSuccess: () => {
      // Refresh the conversation data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  });

  // Handle audio transcription
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setTranscriptionStatus("processing");

    try {
      // Create form data with the proper file name and type
      const formData = new FormData();
      // Make sure we're sending a file with the correct name and MIME type
      const file = new File([audioBlob], "audio.webm", { type: audioBlob.type || "audio/webm" });
      formData.append("audio", file);

      console.log("Sending audio for transcription, size:", file.size, "type:", file.type);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      if (responseData.text) {
        console.log("Transcription successful:", responseData.text);
        setTranscribedText(responseData.text);
        setTranscriptionStatus("confirm");
      } else {
        throw new Error("No transcription text received from API");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscriptionStatus("idle");
      resetRecording();
    }
  };

  // When recording is stopped, start transcription
  useEffect(() => {
    if (audioBlob && !isRecording) {
      transcribeAudio();
    }
  }, [audioBlob, isRecording]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  // Streaming response state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

  // Simulate streaming text effect for AI responses
  const simulateStreamingResponse = (fullText: string, messageId: number) => {
    setIsStreaming(true);
    setStreamingMessageId(messageId);

    let currentIndex = 0;
    const textLength = fullText.length;
    const chunkSize = Math.max(1, Math.floor(textLength / 30)); // Adjust for speed

    setStreamingText("");

    const streamInterval = setInterval(() => {
      if (currentIndex < textLength) {
        const nextIndex = Math.min(currentIndex + chunkSize, textLength);
        setStreamingText(fullText.substring(0, nextIndex));
        currentIndex = nextIndex;
      } else {
        clearInterval(streamInterval);
        setIsStreaming(false);
        setStreamingMessageId(null);
      }
    }, 25); // Adjust timing for realistic feel

    return () => clearInterval(streamInterval);
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() && !transcribedText) return;

    const contentToSend = transcriptionStatus === "confirm" ? transcribedText : message;

    if (contentToSend.trim()) {
      if (transcriptionStatus === "confirm") {
        setTranscriptionStatus("sending");
      }

      const result = await sendMessageMutation.mutateAsync(contentToSend);

      // Simulate streaming for AI response
      if (result?.aiResponse) {
        simulateStreamingResponse(result.aiResponse.content, result.aiResponse.id);
      }

      if (transcriptionStatus === "sending") {
        setTranscriptionStatus("idle");
        resetRecording();
      }
    }
  };

  // Handle transcription confirmation
  const handleConfirmTranscription = () => {
    handleSendMessage();
  };

  // Handle transcription cancellation
  const handleCancelTranscription = () => {
    setTranscriptionStatus("idle");
    setTranscribedText("");
    resetRecording();
  };

  // Handle transcription edit
  const handleEditTranscription = (text: string) => {
    setTranscribedText(text);
  };

  // Group messages by date for display
  const groupMessagesByDate = (messages: MessageWithContactLinks[] = []) => {
    const groups: { [date: string]: MessageWithContactLinks[] } = {};

    messages.forEach(message => {
      // Handle potentially null created_at
      const createdDate = message.created_at ? new Date(message.created_at) : new Date();
      const date = createdDate.toDateString();

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation",
        user_id: user?.id
      });
      
      if (!response.ok) throw new Error("Failed to create conversation");
      
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Reset the message input
      setMessage("");
      setTranscriptionStatus("idle");
      resetRecording();
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  // Check if loading or error
  if (conversationsQuery.isLoading || (isLoading && conversationId)) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className={`h-24 w-4/5 ${i % 2 === 0 ? 'rounded-tl-lg rounded-tr-lg rounded-bl-lg' : 'rounded-tl-lg rounded-tr-lg rounded-br-lg'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If there's no conversation yet or an error occurred, show the empty state
  if (conversationsQuery.isError || isError || !conversationId || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6">
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 mb-8">
            <svg className="w-12 h-12 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
              <path d="M7 9h10M7 13h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Welcome to RevocAI</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Start a new conversation to record, transcribe, and manage your voice conversations with AI assistance.
          </p>
          <Button 
            onClick={handleNewConversation}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition duration-200 flex items-center mx-auto"
          >
            <span className="material-icons text-sm mr-2">add</span>
            New Conversation
          </Button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(data.messages);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Chat header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center overflow-hidden">
          <h2 className="font-medium text-lg text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
            {data.conversation.title}
          </h2>
        </div>
        <div className="flex-shrink-0">
          <button 
            className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-full flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            title="Generate Title"
            onClick={() => generateTitleMutation.mutate()}
            disabled={generateTitleMutation.isPending}
          >
            {generateTitleMutation.isPending ? (
              <>
                <span className="material-icons animate-spin text-sm">refresh</span>
                <span className="hidden sm:inline ml-1">Generating...</span>
              </>
            ) : (
              <>
                <span className="material-icons text-sm">edit</span>
                <span className="hidden sm:inline ml-1">Rename</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 pb-safe">
        {Object.entries(messageGroups).map(([date, messages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center mb-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                {formatRelative(new Date(date), new Date())}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.sender === "user"}
                  isStreaming={isStreaming && streamingMessageId === message.id}
                  streamingText={streamingText}
                />
              ))}
            </div>
          </div>
        ))}

        {/* If there are detected contacts, show contact prompt */}
        {detectedContacts.map((contact) => (
          <ContactPrompt
            key={contact.name}
            name={contact.name}
            contextInfo={contact.contextInfo}
            onSaveContact={() => {
              if (user) {
                createContactMutation.mutate({
                  user_id: user.id,
                  name: contact.name,
                  notes: contact.contextInfo
                });
              }
            }}
            onMergeContact={() => {
              // For now, just remove from list since merge is more complex
              setDetectedContacts(prev => 
                prev.filter(c => c.name !== contact.name)
              );
            }}
          />
        ))}

        {/* Transcription in progress */}
        {transcriptionStatus === "processing" && (
          <TranscriptionProcessing onCancel={handleCancelTranscription} />
        )}

        {/* Transcription confirmation */}
        {transcriptionStatus === "confirm" && (
          <TranscriptionConfirmation
            text={transcribedText}
            onConfirm={handleConfirmTranscription}
            onEdit={handleEditTranscription}
            onCancel={handleCancelTranscription}
          />
        )}

        {/* Show typing indicator when message is being processed but streaming hasn't started yet */}
        {sendMessageMutation.isPending && !isStreaming && (
          <div className="flex justify-start mb-4">
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input - ChatGPT style */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 sm:p-4 pb-safe">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="relative border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Text input area */}
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message RevocAI..."
                className="w-full resize-none px-3 sm:px-4 py-2 sm:py-3 max-h-[150px] min-h-[48px] sm:min-h-[56px] rounded-xl pr-[70px] sm:pr-20 focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                disabled={transcriptionStatus !== "idle" || isRecording || sendMessageMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={message.split('\n').length > 3 ? 3 : message.split('\n').length || 1}
              />

              {/* Action buttons positioned at the bottom right of textarea */}
              <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 flex items-center">
                {/* Voice recorder button */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 sm:h-9 sm:w-9 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mr-1"
                  onClick={startRecording}
                  disabled={transcriptionStatus !== "idle" || isRecording || sendMessageMutation.isPending}
                  title="Record voice message"
                >
                  <span className="material-icons text-sm sm:text-base">mic</span>
                </Button>

                {/* Send button - shows when there's text or in confirmation mode */}
                {(message.trim() || transcriptionStatus === "confirm") && (
                  <Button
                    type="button"
                    size="icon"
                    className="h-7 w-7 sm:h-9 sm:w-9 rounded-md bg-primary text-white"
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                    title="Send message"
                  >
                    <span className="material-icons text-sm sm:text-base">send</span>
                  </Button>
                )}

                {/* Recording indicator - only show while recording */}
                {isRecording && (
                  <div className="flex items-center">
                    <span className="text-red-500 animate-pulse mr-1 sm:mr-2">●</span>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mr-1 sm:mr-2">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 sm:h-9 sm:w-9 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={stopRecording}
                      title="Stop recording"
                    >
                      <span className="material-icons text-sm sm:text-base">stop</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}