import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-2xl inline-flex max-w-[100px]">
      <motion.div
        className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0.4 }}
      />
    </div>
  );
}