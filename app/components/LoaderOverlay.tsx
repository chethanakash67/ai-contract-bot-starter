"use client";
import React from "react";
import { useLoading } from "./LoadingContext";

export default function LoaderOverlay() {
  const { isLoading } = useLoading();
  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm select-none">
      <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-md shadow">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" aria-hidden="true" />
        <span className="text-xs text-gray-700">Loading…</span>
      </div>
    </div>
  );
}

