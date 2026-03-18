'use client';

import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: { name: string; email: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: { name: 'Operator', email: 'operator@runtimemax.dev' },
  isAuthenticated: true,
  isLoading: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: { name: 'Operator', email: 'operator@runtimemax.dev' },
        isAuthenticated: true,
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
