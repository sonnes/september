'use client';

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
}

type AuthContext = {
  user?: AuthUser;
};

const AuthContext = createContext<AuthContext | undefined>(undefined);

export const AuthProvider = ({
  user,
  children,
}: {
  user?: AuthUser;
  children: React.ReactNode;
}) => {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(`useAuth must be used within a Auth Context Provider.`);
  }
  return context;
};
