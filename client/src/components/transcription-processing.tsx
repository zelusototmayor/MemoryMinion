type TranscriptionProcessingProps = {
  onCancel: () => void;
};

export function TranscriptionProcessing({ onCancel }: TranscriptionProcessingProps) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 w-[85%]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Transcribing your message...
          </p>
          <button
            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            onClick={onCancel}
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
        <div className="flex items-center justify-center h-12 mb-2">
          <div className="pulse-animation">
            <span className="material-icons text-3xl text-primary">graphic_eq</span>
          </div>
        </div>
      </div>
    </div>
  );
}
