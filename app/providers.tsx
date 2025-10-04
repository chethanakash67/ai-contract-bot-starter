"use client";
import React, { useEffect } from "react";
import { LoadingProvider, useLoading } from "./components/LoadingContext";
import LoaderOverlay from "./components/LoaderOverlay";
import { usePathname } from "next/navigation";

function RouteChangeResetter() {
  const pathname = usePathname();
  const { reset } = useLoading();
  useEffect(() => {
    // When route changes, ensure any in-flight navigational loader is cleared.
    reset();
  }, [pathname, reset]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LoadingProvider>
      {/* Resets loading on route changes to avoid stale overlay */}
      <RouteChangeResetter />
      {/* Global overlay displayed whenever loading counter > 0 */}
      <LoaderOverlay />
      {children}
    </LoadingProvider>
  );
}

