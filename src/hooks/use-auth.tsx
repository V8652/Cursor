
import { useState, useCallback } from 'react';
import { toast } from './use-toast';
import { DatabaseEvent, dbEvents } from '@/lib/db-event';

export interface AuthState {
  isAuthenticated: boolean;
  userEmail: string | null;
  token: string | null;
  expiresAt: number | null;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  userEmail: null,
  token: null,
  expiresAt: null
};

export const useAuth = () => {
  const [authState] = useState<AuthState>(defaultAuthState);
  
  const loadAuth = useCallback(() => {
    return false;
  }, []);
  
  const saveAuth = useCallback((token: string, email: string, expiresAt: number | null) => {
    toast({
      title: "Authentication Disabled",
      description: "Authentication has been removed from this application.",
      variant: "destructive"
    });
  }, []);
  
  const clearAuth = useCallback(() => {
    dbEvents.emit(DatabaseEvent.AUTH_STATE_CHANGED);
  }, []);
  
  return {
    authState,
    isAuthenticated: false,
    userEmail: null,
    saveAuth,
    clearAuth,
    loadAuth
  };
};
