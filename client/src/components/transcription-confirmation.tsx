import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type TranscriptionConfirmationProps = {
  text: string;
  onConfirm: () => void;
  onEdit: (text: string) => void;
  onCancel: () => void;
};

export function TranscriptionConfirmation({
  text,
  onConfirm,
  onEdit,
  onCancel,
}: TranscriptionConfirmationProps) {
  const [editedText, setEditedText] = useState(text);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
    onEdit(e.target.value);
  };

  return (
    <div className="flex justify-center my-4">
      <motion.div 
        className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-[90%] max-w-3xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <span className="material-icons text-primary mr-2">edit_note</span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Your Transcribed Message
            </p>
          </div>
          <button
            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="mb-4">
          <textarea
            value={editedText}
            onChange={handleTextChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-gray-100 text-sm"
            rows={4}
          />
        </div>
        
        <div className="flex space-x-3 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            size="sm"
            onClick={onConfirm}
          >
            <span className="material-icons mr-1 text-sm">send</span>
            Send
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
