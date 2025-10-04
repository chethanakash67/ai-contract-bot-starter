"use client";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type LoadingContextValue = {
  isLoading: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  // Track pending timers if needed in future; avoid stale state issues
  const countRef = useRef(0);

  const start = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const stop = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

  const reset = useCallback(() => {
    countRef.current = 0;
    setCount(0);
  }, []);

  const value = useMemo<LoadingContextValue>(() => ({
    isLoading: count > 0,
    start,
    stop,
    reset,
  }), [count, start, stop, reset]);

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}

