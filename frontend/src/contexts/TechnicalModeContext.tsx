import { createContext, useContext, useState, type ReactNode } from 'react';

interface TechnicalModeContextValue {
  technicalMode: boolean;
  setTechnicalMode: (next: boolean) => void;
  toggleTechnicalMode: () => void;
}

const TechnicalModeContext = createContext<TechnicalModeContextValue>({
  technicalMode: false,
  setTechnicalMode: () => {},
  toggleTechnicalMode: () => {},
});

export function TechnicalModeProvider({ children }: { children: ReactNode }) {
  const [technicalMode, setTechnicalMode] = useState(false);

  return (
    <TechnicalModeContext.Provider
      value={{
        technicalMode,
        setTechnicalMode,
        toggleTechnicalMode: () => setTechnicalMode((prev) => !prev),
      }}
    >
      {children}
    </TechnicalModeContext.Provider>
  );
}

export function useTechnicalMode() {
  return useContext(TechnicalModeContext);
}
