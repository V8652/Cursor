import mitt, { Emitter } from 'mitt';
import { useEffect, useRef, useCallback } from 'react';

export enum DatabaseEvent {
  TRANSACTION_ADDED = 'transaction_added',
  TRANSACTION_UPDATED = 'transaction_updated',
  TRANSACTION_DELETED = 'transaction_deleted',
  TRANSACTION_IMPORTED = 'transaction_imported',
  CATEGORY_UPDATED = 'category_updated',
  SMS_RULES_REFRESH = 'sms_rules_refresh',
  MERCHANT_NOTES_REFRESH = 'merchant_notes_refresh',
  MERCHANT_NOTES_IMPORTED = 'merchant_notes_imported',
  DATA_IMPORTED = 'data_imported',
  
  // Additional events used in the app
  BALANCE_UPDATED = 'balance_updated',
  TRANSACTION_LIST_REFRESH = 'transaction_list_refresh',
  CATEGORIES_REFRESH = 'categories_refresh',
  CATEGORIES_IMPORTED = 'categories_imported',
  PARSER_RULES_IMPORTED = 'parser_rules_imported',
  UI_REFRESH_NEEDED = 'ui_refresh_needed',
  USER_PREFERENCES_UPDATED = 'user_preferences_updated',
  AUTH_STATE_CHANGED = 'auth_state_changed',
  GMAIL_SCAN_COMPLETED = 'gmail_scan_completed',
  
  // New event types for improved UI updates
  FORCE_UI_REFRESH = 'force_ui_refresh',
  GLOBAL_DATA_REFRESH = 'global_data_refresh'
}

export type DBEvents = {
  [DatabaseEvent.TRANSACTION_ADDED]: boolean;
  [DatabaseEvent.TRANSACTION_UPDATED]: boolean;
  [DatabaseEvent.TRANSACTION_DELETED]: boolean;
  [DatabaseEvent.TRANSACTION_IMPORTED]: boolean;
  [DatabaseEvent.CATEGORY_UPDATED]: boolean;
  [DatabaseEvent.SMS_RULES_REFRESH]: boolean;
  [DatabaseEvent.MERCHANT_NOTES_REFRESH]: boolean;
  [DatabaseEvent.MERCHANT_NOTES_IMPORTED]: boolean;
  [DatabaseEvent.DATA_IMPORTED]: boolean;
  [DatabaseEvent.BALANCE_UPDATED]: boolean;
  [DatabaseEvent.TRANSACTION_LIST_REFRESH]: boolean;
  [DatabaseEvent.CATEGORIES_REFRESH]: boolean;
  [DatabaseEvent.CATEGORIES_IMPORTED]: boolean;
  [DatabaseEvent.PARSER_RULES_IMPORTED]: boolean;
  [DatabaseEvent.UI_REFRESH_NEEDED]: boolean;
  [DatabaseEvent.USER_PREFERENCES_UPDATED]: boolean;
  [DatabaseEvent.AUTH_STATE_CHANGED]: boolean;
  [DatabaseEvent.GMAIL_SCAN_COMPLETED]: boolean;
  [DatabaseEvent.FORCE_UI_REFRESH]: { componentId?: string; timestamp: number; source?: string };
  [DatabaseEvent.GLOBAL_DATA_REFRESH]: { source: string; timestamp: number };
};

// Create the event emitter
const mittInstance: Emitter<DBEvents> = mitt<DBEvents>();

// Enhanced event logger
const logEvent = (event: string, data?: any) => {
  console.log(`[DB Event] ${event}`, data ? data : '');
};

// Create a wrapper with the same API as the previous implementation but with improved event handling
export const dbEvents = {
  emit: (event: DatabaseEvent, data?: any) => {
    logEvent(event, data);
    mittInstance.emit(event, data);
    
    // For critical events that should definitely trigger UI updates, also emit UI_REFRESH_NEEDED
    const criticalEvents = [
      DatabaseEvent.TRANSACTION_ADDED, 
      DatabaseEvent.TRANSACTION_UPDATED,
      DatabaseEvent.TRANSACTION_DELETED,
      DatabaseEvent.DATA_IMPORTED,
      DatabaseEvent.BALANCE_UPDATED
    ];
    
    if (criticalEvents.includes(event)) {
      setTimeout(() => {
        mittInstance.emit(DatabaseEvent.UI_REFRESH_NEEDED, true);
        mittInstance.emit(DatabaseEvent.FORCE_UI_REFRESH, { 
          timestamp: Date.now(),
          componentId: 'global'
        });
      }, 50);
    }
  },
  
  // Fix the subscribe method implementation to properly use mitt's 'on' method
  subscribe: (event: DatabaseEvent, callback: (data?: any) => void) => {
    mittInstance.on(event, callback);
    // Return an unsubscribe function
    return () => {
      mittInstance.off(event, callback);
    };
  },
  
  // Add broadcast method to emit multiple related events at once
  broadcast: (events: DatabaseEvent[], data?: any) => {
    events.forEach(event => {
      logEvent(event, data);
      mittInstance.emit(event, data);
    });
    
    // Always include FORCE_UI_REFRESH when broadcasting
    setTimeout(() => {
      mittInstance.emit(DatabaseEvent.FORCE_UI_REFRESH, { 
        timestamp: Date.now(),
        componentId: 'broadcast'
      });
    }, 50);
  },
  
  // Add a global refresh method to update all UI components
  refreshAll: (source: string = 'manual') => {
    const timestamp = Date.now();
    
    // Define different refresh patterns based on the source
    const refreshPatterns = {
      'manual': [
        // Full refresh for manual triggers
        DatabaseEvent.UI_REFRESH_NEEDED,
        DatabaseEvent.TRANSACTION_LIST_REFRESH,
        DatabaseEvent.BALANCE_UPDATED,
        DatabaseEvent.FORCE_UI_REFRESH
      ],
      'visibility-change': [
        // Refresh when app becomes visible again
        DatabaseEvent.TRANSACTION_LIST_REFRESH,
        DatabaseEvent.BALANCE_UPDATED,
        // Force UI refresh when app becomes visible
        DatabaseEvent.FORCE_UI_REFRESH
      ],
      'keyboard-shortcut': [
        // Full refresh for keyboard shortcut
      DatabaseEvent.UI_REFRESH_NEEDED,
      DatabaseEvent.TRANSACTION_LIST_REFRESH,
      DatabaseEvent.BALANCE_UPDATED,
        DatabaseEvent.FORCE_UI_REFRESH
      ]
    };
    
    // Get the appropriate refresh pattern based on source
    const refreshEvents = refreshPatterns[source as keyof typeof refreshPatterns] || refreshPatterns.manual;
    
    logEvent('REFRESH', { source, timestamp, events: refreshEvents });
    
    // Emit events with a small delay between data and UI refreshes
    refreshEvents.forEach((event, index) => {
      if (event === DatabaseEvent.FORCE_UI_REFRESH) {
        // Add a small delay for UI-related events to batch them together
        setTimeout(() => {
        mittInstance.emit(event, { source, timestamp });
        }, index * 50); // 50ms delay between events
      } else {
        mittInstance.emit(event, true);
      }
    });
  }
};

// Custom hooks for using DB events in React components with improved stability
export const useDbEvents = (event: DatabaseEvent, callback: (data?: any) => void) => {
  const savedCallback = useRef(callback);
  
  // Update ref whenever callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  // Stable event handler
  const stableEventHandler = useCallback((data: any) => {
    savedCallback.current(data);
  }, []);
  
  useEffect(() => {
    const unsubscribe = dbEvents.subscribe(event, stableEventHandler);
    return unsubscribe;
  }, [event, stableEventHandler]);
};

export const useMultipleDbEvents = (eventCallbacks: [DatabaseEvent, (data?: any) => void][]) => {
  // Store callbacks in refs to avoid unnecessary effect triggers
  const callbackRefs = useRef<Map<DatabaseEvent, (data?: any) => void>>(new Map());
  
  // Update callback refs
  useEffect(() => {
    eventCallbacks.forEach(([event, callback]) => {
      callbackRefs.current.set(event, callback);
    });
  }, [eventCallbacks]);
  
  // Create stable handlers that reference the latest callbacks
  const stableHandlers = useRef<Map<DatabaseEvent, (data?: any) => void>>(new Map());
  
  // Initialize stable handlers
  useEffect(() => {
    eventCallbacks.forEach(([event]) => {
      if (!stableHandlers.current.has(event)) {
        stableHandlers.current.set(event, (data: any) => {
          const callback = callbackRefs.current.get(event);
          if (callback) callback(data);
        });
      }
    });
    
    // Subscribe to events
    const unsubscribers: (() => void)[] = [];
    
    eventCallbacks.forEach(([event]) => {
      const handler = stableHandlers.current.get(event);
      if (handler) {
        unsubscribers.push(dbEvents.subscribe(event, handler));
      }
    });
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [eventCallbacks.map(([event]) => event).join(',')]);
};

// Force UI refresh helper hook
export const useForceUiRefresh = (componentId: string, callback: () => void) => {
  useDbEvents(DatabaseEvent.FORCE_UI_REFRESH, (data) => {
    if (!data || !data.componentId || data.componentId === 'global' || data.componentId === componentId) {
      callback();
    }
  });
};

// Global data refresh helper hook
export const useGlobalDataRefresh = (callback: (data: { source: string; timestamp: number }) => void) => {
  useDbEvents(DatabaseEvent.GLOBAL_DATA_REFRESH, callback);
};
