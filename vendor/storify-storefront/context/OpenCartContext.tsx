import React from 'react';

const OpenCartContext = React.createContext<{ openCart: () => void }>({ openCart: () => {} });

export function OpenCartProvider({ openCart, children }: { openCart: () => void; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ openCart }), [openCart]);
  return <OpenCartContext.Provider value={value}>{children}</OpenCartContext.Provider>;
}

export function useOpenCart(): () => void {
  return React.useContext(OpenCartContext).openCart;
}
