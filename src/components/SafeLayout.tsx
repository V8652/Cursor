
import React from 'react';
import { Layout } from './Layout';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

interface SafeLayoutProps {
  children: React.ReactNode;
}

/**
 * A wrapper component that provides a safe way to use Layout
 * both inside and outside Router context
 */
const SafeLayout: React.FC<SafeLayoutProps> = ({ children }) => {
  // Get the current path from the router if available
  let currentPath = '/';
  try {
    const location = useLocation();
    currentPath = location.pathname;
    
    // Removed auto-scroll to top to prevent page jumps on updates
  } catch (error) {
    // If we're outside router context, use default path
    console.log('Using SafeLayout outside router context');
  }

  return (
    <AnimatePresence mode="wait">
      <Layout>{children}</Layout>
    </AnimatePresence>
  );
};

export default SafeLayout;
