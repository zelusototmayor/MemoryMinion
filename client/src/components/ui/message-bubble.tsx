import { Message, MessageWithContactLinks, ContactLinkWithName } from "@shared/schema";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type MessageBubbleProps = {
  message: Message | MessageWithContactLinks;
  isUser: boolean;
  isStreaming?: boolean;
  streamingText?: string;
};

export function MessageBubble({ message, isUser, isStreaming = false, streamingText = "" }: MessageBubbleProps) {
  const createdDate = message.created_at ? new Date(message.created_at) : new Date();
  const time = format(createdDate, "h:mm a");
  const [, navigate] = useLocation();
  const [displayedText, setDisplayedText] = useState<string>(message.content);
  
  // Update the displayed text when streaming
  useEffect(() => {
    if (isStreaming && streamingText) {
      setDisplayedText(streamingText);
    } else {
      setDisplayedText(message.content);
    }
  }, [isStreaming, streamingText, message.content]);
  
  // Check if message has contact links
  const hasContactLinks = 'contactLinks' in message && message.contactLinks && message.contactLinks.length > 0;
  
  // Process AI-specific formatting for dates, contacts, and conversations
  const processSpecialFormatting = (text: string): string => {
    // Process dates (format: **DATE: YYYY-MM-DD**)
    let processed = text.replace(
      /\*\*DATE: (\d{4}-\d{2}-\d{2})\*\*/g, 
      '<span class="text-primary font-medium">$1</span>'
    );
    
    // Process contact references (format: [[Contact: Name]])
    processed = processed.replace(
      /\[\[Contact: ([^\]]+)\]\]/g,
      '<a href="/contact-search?name=$1" class="bg-primary-100 dark:bg-primary-900 text-primary dark:text-primary-300 px-1 rounded hover:underline">$1</a>'
    );
    
    // Process conversation references (format: [[Conversation: Topic]])
    processed = processed.replace(
      /\[\[Conversation: ([^\]]+)\]\]/g,
      '<a href="/search?q=$1" class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded hover:underline">$1</a>'
    );
    
    // Enhance markdown list items with additional styling
    processed = processed.replace(
      /^- (.+)$/gm,
      '<li class="pl-1 py-1 flex"><span class="text-primary mr-2">•</span><span>$1</span></li>'
    );
    
    // Enhance markdown headings
    processed = processed.replace(
      /^## (.+)$/gm,
      '<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-3 mb-2">$1</h3>'
    );
    
    return processed;
  };
  
  // Function to render rich, formatted content for AI messages
  const renderRichMessageContent = () => {
    // Get the content to display (streaming or final)
    const content = isStreaming ? streamingText : message.content;
    
    if (isUser) {
      // For user messages, just use the simple highlighting of contacts
      if (!hasContactLinks) {
        return (
          <motion.p 
            className="text-sm"
            initial={isStreaming ? { opacity: 1 } : {}}
            animate={isStreaming ? { opacity: 1 } : {}}
          >
            {content}
          </motion.p>
        );
      }
      
      // If user message has contacts, highlight them
      return renderContactHighlighting(content);
    } else {
      // For AI messages, use the full rich rendering with markdown and special formatting
      
      // First, apply our special formatters to the raw content
      let processedContent = processSpecialFormatting(content);
      
      // Then, parse the markdown
      const htmlContent = marked.parse(processedContent) as string;
      
      // Sanitize the HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(htmlContent);
      
      // Return the formatted content
      return (
        <div
          className="text-sm prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }
  };
  
  // Function to highlight contact names in message content (used for user messages)
  const renderContactHighlighting = (content: string) => {
    // Ensure TypeScript recognizes we're working with MessageWithContactLinks
    const messageWithContacts = message as MessageWithContactLinks;
    
    // Sort contact links by name length (longest first) to prevent shorter names from 
    // matching inside longer names
    const sortedContactLinks = [...messageWithContacts.contactLinks!]
      .sort((a, b) => (b.contact_name || '').length - (a.contact_name || '').length);
    
    // This approach generates an array of segments including both regular text and highlighted contacts
    let segments: Array<{isContact: boolean, text: string, contactId?: number}> = [{isContact: false, text: content}];
    
    sortedContactLinks.forEach((contactLink: ContactLinkWithName) => {
      const contactName = contactLink.contact_name || '';
      if (!contactName) return; // Skip if no contact name available
      
      const newSegments: typeof segments = [];
      
      segments.forEach(segment => {
        if (!segment.isContact) {
          const parts = segment.text.split(new RegExp(`(${contactName})`, 'i'));
          
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase() === contactName.toLowerCase()) {
              newSegments.push({
                isContact: true, 
                text: parts[i], 
                contactId: contactLink.contact_id
              });
            } else if (parts[i]) {
              newSegments.push({isContact: false, text: parts[i]});
            }
          }
        } else {
          newSegments.push(segment);
        }
      });
      
      segments = newSegments;
    });
    
    return (
      <p className="text-sm">
        {segments.map((segment, index) => 
          segment.isContact ? (
            <span 
              key={index} 
              className="bg-primary-100 dark:bg-primary-900 text-primary dark:text-primary-300 px-1 rounded cursor-pointer"
              onClick={() => navigate(`/contact/${segment.contactId}`)}
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </p>
    );
  };
  
  if (isUser) {
    return (
      <div className="flex flex-col items-end space-y-1 max-w-[85%] ml-auto">
        <div className="message-bubble-user bg-primary text-white p-3 rounded-tl-lg rounded-tr-lg rounded-bl-lg">
          {renderRichMessageContent()}
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
          {hasContactLinks && (
            <span className="text-xs text-primary dark:text-primary-400">
              • {(message as MessageWithContactLinks).contactLinks!.length} contact{(message as MessageWithContactLinks).contactLinks!.length !== 1 ? "s" : ""} mentioned
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-1 max-w-[85%]">
      <motion.div 
        className="message-bubble-ai bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-tl-lg rounded-tr-lg rounded-br-lg shadow-sm"
        initial={{ opacity: 0.8, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
            AI
          </div>
          <div className="flex-1">
            {renderRichMessageContent()}
          </div>
        </div>
      </motion.div>
      <div className="flex items-center space-x-1 pl-8">
        <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
        {hasContactLinks && (
          <span className="text-xs text-primary dark:text-primary-400">
            • {(message as MessageWithContactLinks).contactLinks!.length} contact{(message as MessageWithContactLinks).contactLinks!.length !== 1 ? "s" : ""} mentioned
          </span>
        )}
      </div>
    </div>
  );
}
