import React from 'react';
import type { TemplateContextValue } from './types';

const TemplateContext = React.createContext<TemplateContextValue | null>(null);

export function TemplateProvider({
  value,
  children,
}: {
  value: TemplateContextValue;
  children: React.ReactNode;
}) {
  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplateContext(): TemplateContextValue {
  const ctx = React.useContext(TemplateContext);
  if (!ctx) throw new Error('useTemplateContext must be used within TemplateProvider');
  return ctx;
}
