'use client';

import { KeyboardShortcutsProvider } from '@/components/layout/KeyboardShortcuts';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>;
}
