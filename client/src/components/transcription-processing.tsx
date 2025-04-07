import { motion } from "framer-motion";

type TranscriptionProcessingProps = {
  onCancel: () => void;
};

export function TranscriptionProcessing({ onCancel }: TranscriptionProcessingProps) {
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
            <span className="material-icons text-primary mr-2">podcasts</span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Processing Audio
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
        
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <span className="material-icons text-4xl text-primary">graphic_eq</span>
              
              {/* Audio wave animation */}
              <div className="absolute inset-0 flex items-center justify-center space-x-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 h-3 bg-primary rounded-full"
                    animate={{
                      height: ["8px", `${12 + Math.random() * 12}px`, "8px"],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transcribing your message...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
