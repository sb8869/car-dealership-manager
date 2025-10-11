// Custom hooks for car dealership game logic

import { useState, useEffect, useRef, useMemo } from 'react';
import { GAME_CONFIG } from '../constants';
import { getGameDay, getNextDayRemaining } from '../utils/gameLogic';

// Hook for managing game time and auto-refresh
export function useGameTime(gameEpoch, onDayChange) {
  const [now, setNow] = useState(Date.now());
  const lastDayRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentDay = getGameDay(gameEpoch);
    if (lastDayRef.current === null) {
      lastDayRef.current = currentDay;
    }
    
    if (currentDay > lastDayRef.current) {
      lastDayRef.current = currentDay;
      onDayChange?.();
    }
  }, [now, gameEpoch, onDayChange]);

  const nextRefreshSeconds = useMemo(() => {
    return getNextDayRemaining(gameEpoch);
  }, [now, gameEpoch]);

  return { now, nextRefreshSeconds, currentDay: getGameDay(gameEpoch) };
}

// Hook for managing localStorage persistence
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

// Hook for managing cooldowns (price updates, refreshes, etc.)
export function useCooldown(duration = 60000) {
  const cooldownsRef = useRef({});

  const startCooldown = (id) => {
    cooldownsRef.current[id] = Date.now();
  };

  const getRemainingTime = (id) => {
    const startTime = cooldownsRef.current[id];
    if (!startTime) return 0;
    return Math.max(0, duration - (Date.now() - startTime));
  };

  const isOnCooldown = (id) => {
    return getRemainingTime(id) > 0;
  };

  const clearCooldown = (id) => {
    delete cooldownsRef.current[id];
  };

  return {
    startCooldown,
    getRemainingTime,
    isOnCooldown,
    clearCooldown
  };
}

// Hook for managing timed events (buyers, repairs, etc.)
export function useTimedEvents() {
  const timersRef = useRef({});

  const scheduleEvent = (id, delay, callback) => {
    // Clear existing timer if it exists
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
    }

    const timer = setTimeout(() => {
      callback();
      delete timersRef.current[id];
    }, delay);

    timersRef.current[id] = timer;
    return timer;
  };

  const cancelEvent = (id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  const clearAllEvents = () => {
    Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
    timersRef.current = {};
  };

  // Cleanup on unmount
  useEffect(() => {
    return clearAllEvents;
  }, []);

  return {
    scheduleEvent,
    cancelEvent,
    clearAllEvents
  };
}

// Hook for managing toast notifications
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast
  };
}

// Hook for managing market data with refresh logic
export function useMarket(initialMarket = []) {
  const [market, setMarket] = useState(initialMarket);
  const lastRefreshRef = useRef(0);

  const canRefresh = useMemo(() => {
    return Date.now() - lastRefreshRef.current >= GAME_CONFIG.REFRESH_COOLDOWN;
  }, []);

  const refreshMarket = (newMarket, force = false) => {
    if (!force && !canRefresh) return false;
    
    lastRefreshRef.current = Date.now();
    setMarket(newMarket);
    return true;
  };

  const getRefreshCooldownRemaining = () => {
    return Math.max(0, GAME_CONFIG.REFRESH_COOLDOWN - (Date.now() - lastRefreshRef.current));
  };

  return {
    market,
    setMarket,
    refreshMarket,
    canRefresh,
    getRefreshCooldownRemaining
  };
}