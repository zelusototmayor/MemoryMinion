import { Message } from "@shared/schema";
import { format } from "date-fns";

type MessageBubbleProps = {
  message: Message;
  isUser: boolean;
};

export function MessageBubble({ message, isUser }: MessageBubbleProps) {
  const time = format(new Date(message.created_at), "h:mm a");
  
  if (isUser) {
    return (
      <div className="flex flex-col items-end space-y-1 max-w-[85%] ml-auto">
        <div className="message-bubble-user bg-primary text-white p-3 rounded-tl-lg rounded-tr-lg rounded-bl-lg">
          <p className="text-sm">{message.content}</p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-1 max-w-[85%]">
      <div className="message-bubble-ai bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-tl-lg rounded-tr-lg rounded-br-lg shadow-sm">
        <p className="text-sm text-gray-800 dark:text-gray-200">{message.content}</p>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
    </div>
  );
}
