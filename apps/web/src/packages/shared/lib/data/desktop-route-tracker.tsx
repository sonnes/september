'use client';

import { useEffect } from 'react';

import { useRouterState } from '@tanstack/react-router';

import { writeDesktopLastRoute } from './desktop-startup';
import { isDesktopRuntime } from './runtime';

export function DesktopRouteTracker() {
  const href = useRouterState({ select: state => state.location.href });

  useEffect(() => {
    if (!isDesktopRuntime()) return;
    void writeDesktopLastRoute(href).catch(error => {
      console.error('Failed to store the desktop route:', error);
    });
  }, [href]);

  return null;
}
