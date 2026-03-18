'use client';

/**
 * Keyboard Shortcuts Provider
 * Global keyboard shortcuts for navigation and accessibility
 *
 * Shortcuts:
 * - ? : Show shortcuts help
 * - Esc : Close modals/dialogs
 * - g+h : Go to Dashboard
 * - g+j : Go to Jobs
 * - g+p : Go to Personas
 * - g+m : Go to Messages
 * - g+r : Go to Reports
 * - g+s : Go to Workspace
 */

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';

interface KeyboardShortcutsContextType {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'H'], description: 'Go to Dashboard' },
      { keys: ['G', 'J'], description: 'Go to Jobs' },
      { keys: ['G', 'P'], description: 'Go to Personas' },
      { keys: ['G', 'M'], description: 'Go to Messages' },
      { keys: ['G', 'R'], description: 'Go to Reports' },
      { keys: ['G', 'S'], description: 'Go to Workspace' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialogs / Cancel' },
    ],
  },
];

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [goPrefix, setGoPrefix] = useState(false);
  const router = useRouter();

  // Check if we're in a text input
  const isInTextInput = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (activeElement as HTMLElement).isContentEditable
    );
  }, []);

  // Handle keyboard events
  useEffect(() => {
    let goTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in text input
      if (isInTextInput()) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // Don't handle if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Handle "g" prefix for navigation
      if (goPrefix) {
        e.preventDefault();
        setGoPrefix(false);
        if (goTimeout) clearTimeout(goTimeout);

        switch (e.key.toLowerCase()) {
          case 'h':
            router.push('/dashboard');
            break;
          case 'j':
            router.push('/dashboard/jobs');
            break;
          case 'p':
            router.push('/dashboard/personas');
            break;
          case 'm':
            router.push('/dashboard/messages');
            break;
          case 'r':
            router.push('/dashboard/reports');
            break;
          case 's':
            router.push('/dashboard/workspace');
            break;
        }
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowHelp(true);
          break;

        case 'Escape':
          setShowHelp(false);
          break;

        case 'g':
          setGoPrefix(true);
          goTimeout = setTimeout(() => setGoPrefix(false), 1000);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (goTimeout) clearTimeout(goTimeout);
    };
  }, [isInTextInput, goPrefix, router]);

  return (
    <KeyboardShortcutsContext.Provider value={{ showHelp, setShowHelp }}>
      {children}

      {/* Keyboard Shortcuts Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {shortcutGroups.map((group) => (
                  <div key={group.title}>
                    <h4 className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-3">
                      {group.title}
                    </h4>
                    <div className="space-y-2">
                      {group.shortcuts.map((shortcut, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <span className="text-stone-700 dark:text-stone-300">{shortcut.description}</span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, keyIdx) => (
                              <span key={keyIdx}>
                                <kbd className="px-2 py-1 text-xs font-mono bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-sm text-stone-700 dark:text-stone-300">
                                  {key}
                                </kbd>
                                {keyIdx < shortcut.keys.length - 1 && (
                                  <span className="mx-1 text-stone-400">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
              <Button mode="light" variant="secondary" className="w-full" onClick={() => setShowHelp(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Go prefix indicator */}
      {goPrefix && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-4 py-2 rounded-lg shadow-lg z-[100] text-sm">
          <span className="font-mono">g</span> → Press h (home), j (jobs), p (personas), m (messages), r (reports), s (settings)
        </div>
      )}
    </KeyboardShortcutsContext.Provider>
  );
}

export default KeyboardShortcutsProvider;
