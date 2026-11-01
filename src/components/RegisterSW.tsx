'use client';

import { useEffect } from 'react';

/** Lets phones offer "Add to Home Screen" / "Install app". Nothing is cached, so the app is always current. */
export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
