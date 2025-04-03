type ContactPromptProps = {
  name: string;
  contextInfo?: string;
  onSaveContact: () => void;
  onMergeContact: () => void;
};

export function ContactPrompt({ name, contextInfo, onSaveContact, onMergeContact }: ContactPromptProps) {
  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  
  // Function to generate a color based on contact name
  const getContactColor = (name: string) => {
    const colors = [
      "blue", "green", "purple", "yellow", "pink", "orange", "indigo", "teal"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  const color = getContactColor(name);
  
  return (
    <div className="flex justify-center my-3">
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-w-[85%]">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New contact detected:</p>
        <div className="flex items-center mb-3">
          <div className={`h-8 w-8 rounded-full bg-${color}-100 dark:bg-${color}-900 flex items-center justify-center text-xs text-${color}-600 dark:text-${color}-300 mr-2`}>
            {getInitial(name)}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{name}</p>
            {contextInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{contextInfo}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            className="flex-1 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-600 transition duration-200"
            onClick={onSaveContact}
          >
            Save as new contact
          </button>
          <button 
            className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition duration-200"
            onClick={onMergeContact}
          >
            Merge with existing
          </button>
        </div>
      </div>
    </div>
  );
}
