import { useState, useEffect, useCallback } from 'react';
import { getUserCategories } from '../lib/db';
import { dbEvents, DatabaseEvent } from '../lib/db-event';

interface UseDatabaseEventsProps {
  onDataChange: () => void;
}

export const useDatabaseEvents = ({ onDataChange }: UseDatabaseEventsProps) => {
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  const loadCategoryColors = useCallback(async () => {
    try {
      const userCategories = await getUserCategories();
      if (userCategories.categoryColors) {
        setCategoryColors(userCategories.categoryColors);
      }
    } catch (error) {
      console.error('Error loading category colors:', error);
    }
  }, []);

  useEffect(() => {
    const handleCategoryChange = () => {
      loadCategoryColors();
    };

    // Initial load
    loadCategoryColors();

    // Subscribe to all relevant events
    const unsubscribers = [
      dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, onDataChange),
      dbEvents.subscribe(DatabaseEvent.TRANSACTION_UPDATED, onDataChange),
      dbEvents.subscribe(DatabaseEvent.TRANSACTION_DELETED, onDataChange),
      dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, onDataChange),
      dbEvents.subscribe(DatabaseEvent.BALANCE_UPDATED, onDataChange),
      dbEvents.subscribe(DatabaseEvent.TRANSACTION_LIST_REFRESH, onDataChange),
      dbEvents.subscribe(DatabaseEvent.UI_REFRESH_NEEDED, onDataChange),
      dbEvents.subscribe(DatabaseEvent.CATEGORY_UPDATED, handleCategoryChange),
      dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleCategoryChange),
      dbEvents.subscribe(DatabaseEvent.UI_REFRESH_NEEDED, handleCategoryChange)
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [onDataChange, loadCategoryColors]);

  return { categoryColors };
}; 