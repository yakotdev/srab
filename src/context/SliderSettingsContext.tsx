import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SliderSettings = {
  borderRadius: number;
  animationSpeed: number;
  accentColor: string;
  showCaptions: boolean;
  grayscale: boolean;
  spacing: number;
  glassEffect: boolean;
  activeStyle: string;
  preset: string;
  categoryStyle: string;
};

interface SliderSettingsContextType {
  settings: SliderSettings;
  setSettings: React.Dispatch<React.SetStateAction<SliderSettings>>;
}

const SliderSettingsContext = createContext<SliderSettingsContextType | undefined>(undefined);

export const SliderSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SliderSettings>({
    borderRadius: 32,
    animationSpeed: 0.5,
    accentColor: '#FF6321',
    showCaptions: true,
    grayscale: false,
    spacing: 32,
    glassEffect: true,
    activeStyle: 'all',
    preset: 'default',
    categoryStyle: 'grid'
  });

  return (
    <SliderSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SliderSettingsContext.Provider>
  );
};

export const useSliderSettings = () => {
  const context = useContext(SliderSettingsContext);
  if (context === undefined) {
    throw new Error('useSliderSettings must be used within a SliderSettingsProvider');
  }
  return context;
};
