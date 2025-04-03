import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="flex justify-center my-3">
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 w-[85%]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm transcription:
          </p>
          <button
            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            onClick={onCancel}
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
        <div className="mb-3">
          <Textarea
            value={editedText}
            onChange={handleTextChange}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 text-sm"
            rows={3}
          />
        </div>
        <div className="flex space-x-2">
          <Button
            className="flex-1 bg-primary text-white"
            onClick={onConfirm}
          >
            Send
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={onCancel}
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
