
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { DatabaseEvent, dbEvents } from '@/lib/db-event';

export function LogoutButton() {
  const { clearAuth } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = () => {
    setIsLoggingOut(true);
    
    try {
      // Clear the token in gapi client if available
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }
      
      // Clear all auth-related data from localStorage
      localStorage.removeItem('pendingAuthCode');
      localStorage.removeItem('user_last_active_timestamp');
      
      // Clear auth state through hook
      clearAuth();
      
      // Notify other components about auth state change
      dbEvents.emit(DatabaseEvent.AUTH_STATE_CHANGED);
      
      toast.success("Logged out successfully");
      
      // Reload the page to reset the app state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <Button 
      variant="destructive" 
      onClick={handleLogout}
      className="w-full flex items-center justify-center gap-2"
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
}
