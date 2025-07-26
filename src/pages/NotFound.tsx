
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div 
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-9xl font-bold text-primary/20 mb-4"
        >
          404
        </motion.div>
        
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        
        <p className="text-muted-foreground mb-6">
          Sorry, we couldn't find the page you're looking for. The page might have been moved or deleted.
        </p>
        
        <Link to="/">
          <Button size="lg" className="btn-primary flex items-center gap-2">
            <Home className="h-5 w-5" />
            Return to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
