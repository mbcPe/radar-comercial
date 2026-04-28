'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Scope = 'propia' | 'total';

type ScopeContextType = {
  scope: Scope;
  setScope: (s: Scope) => void;
};

const ScopeContext = createContext<ScopeContextType | undefined>(undefined);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<Scope>('propia');
  return (
    <ScopeContext.Provider value={{ scope, setScope }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error('useScope debe usarse dentro de ScopeProvider');
  return ctx;
}