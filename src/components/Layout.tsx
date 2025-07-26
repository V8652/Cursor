
import * as React from "react";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnimatePresence mode="wait">
        <motion.main 
          className="flex-1 pb-20 w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-1 sm:p-2">
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
};

export { Layout };
