'use client';

/**
 * Empty State Component
 * WEB-11: Reusable empty state for list pages
 */

import { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/Card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  mode?: 'light' | 'dark';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  mode = 'light',
}: EmptyStateProps) {
  const defaultIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );

  return (
    <Card mode={mode}>
      <CardContent>
        <div className="text-center py-16">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            mode === 'light' ? 'bg-stone-100 text-stone-400' : 'bg-stone-800 text-stone-500'
          }`}>
            {icon || defaultIcon}
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${
            mode === 'light' ? 'text-stone-800' : 'text-stone-100'
          }`}>
            {title}
          </h3>
          <p className={`mb-6 max-w-sm mx-auto ${
            mode === 'light' ? 'text-stone-500' : 'text-stone-400'
          }`}>
            {description}
          </p>
          {action && <div>{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-defined empty states for common scenarios
export function EmptyStateCertificates({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6" />
          <path d="M9 15h6" />
        </svg>
      }
      title="No certificates yet"
      description="Issue your first certificate to get started with verifiable model provenance."
      action={action}
    />
  );
}

export function EmptyStateModels({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      }
      title="No models registered"
      description="Register your first model to start issuing verifiable certificates."
      action={action}
    />
  );
}

export function EmptyStateDatasets({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      }
      title="No datasets yet"
      description="Register datasets to track their provenance and associate them with models."
      action={action}
    />
  );
}

export function EmptyStateKeys({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      }
      title="No signing keys"
      description="Create a signing key to cryptographically sign your certificates."
      action={action}
    />
  );
}

export function EmptyStateTokens({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      }
      title="No API tokens"
      description="Create an API token to authenticate your integrations and CI/CD pipelines."
      action={action}
    />
  );
}

export function EmptyStateNotifications() {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      }
      title="No notifications"
      description="You're all caught up! Notifications about your certificates and account will appear here."
    />
  );
}

export function EmptyStateSearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      }
      title="No results found"
      description={`No results found for "${query}". Try adjusting your search terms.`}
    />
  );
}

export function EmptyStateTeam({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
      title="No team members"
      description="Invite team members to collaborate on certificates and manage models."
      action={action}
    />
  );
}
