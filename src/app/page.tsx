'use client';

import React, { useEffect, useState, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import MainLayout from '@/components/layout/MainLayout';
import '@/i18n';

export default function Home() {
  const initialize = useStore((s) => s.initialize);
  const initialized = useStore((s) => s.initialized);
  const settings = useStore((s) => s.settings);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme (only dark or light, no system)
    const root = document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme, mounted]);

  if (!mounted || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <h1 className="text-2xl font-bold">GraphIt</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}
