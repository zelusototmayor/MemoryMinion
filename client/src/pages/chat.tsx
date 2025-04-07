import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ChatPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [match, params] = useRoute<{ id: string }>("/conversation/:id");
  const conversationId = match && params ? parseInt(params.id) : null;

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

  const { data, isLoading, isError } = useQuery<{
    conversation: Conversation;
    messages: MessageWithContactLinks[];
  }>({
    queryKey: ["/api/conversations", conversationId],
    queryFn: () => fetch(`/api/conversations/${conversationId}`).then((res) => res.json()),
    enabled: conversationId !== null,
  });

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
      setMessage("");

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

  // Handle audio transcription
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setTranscriptionStatus("processing");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.transcription) {
        setTranscribedText(data.transcription);
        setTranscriptionStatus("confirm");
      } else {
        throw new Error("Failed to transcribe audio");
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

  // Go back to conversation list
  const handleBack = () => {
    navigate("/");
  };

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

  // Check if loading or error
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-20 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={handleBack} className="mr-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <span className="material-icons">arrow_back</span>
            </button>
            <Skeleton className="h-6 w-40" />
          </div>
        </header>
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

  if (isError || !data) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-20 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={handleBack} className="mr-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 className="font-medium text-lg text-gray-900 dark:text-white">Error</h2>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load conversation.</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(data.messages);

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-20 flex flex-col">
      {/* Chat header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <h2 className="font-medium text-lg text-gray-900 dark:text-white">
            {data.conversation.title}
          </h2>
        </div>
        <div>
          <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <span className="material-icons">more_vert</span>
          </button>
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
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
                className="w-full resize-none px-4 py-3 max-h-[200px] min-h-[56px] rounded-xl pr-20 focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              <div className="absolute bottom-2 right-2 flex items-center">
                {/* Voice recorder button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mr-1"
                onClick={startRecording}
                disabled={transcriptionStatus !== "idle" || isRecording || sendMessageMutation.isPending}
                title="Record voice message"
              >
                <span className="material-icons">mic</span>
              </Button>

              {/* Send button - shows when there's text or in confirmation mode */}
              {(message.trim() || transcriptionStatus === "confirm") && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={`h-9 w-9 rounded-md flex items-center justify-center ${
                      message.trim() || transcriptionStatus === "confirm" 
                        ? "bg-primary text-white" 
                        : "text-gray-400"
                    }`}
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <span className="animate-spin">↻</span>
                    ) : (
                      <span className="material-icons">send</span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Input help text */}
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Type a message or click the microphone icon to record your voice
          </div>
        </div>
      </div>

      {/* Recording indicator - Integrated into input area when recording */}
      {isRecording && (
        <div className="fixed bottom-20 inset-x-0 flex justify-center z-50">
          <motion.div 
            className="bg-white dark:bg-gray-800 shadow-lg rounded-xl px-4 py-3 flex items-center space-x-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-center h-8 w-8 bg-red-500 rounded-full animate-pulse">
              <span className="material-icons text-white">mic</span>
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                  Recording
                </span>
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></div>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {recordingTime} seconds
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={stopRecording}
            >
              <span className="material-icons text-gray-600 dark:text-gray-300">stop</span>
              <span className="ml-1 text-sm">Stop</span>
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}