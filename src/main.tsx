import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeApp } from './ThemeApp.tsx';
import './index.css';
import { SliderSettingsProvider } from './context/SliderSettingsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SliderSettingsProvider>
      <ThemeApp />
    </SliderSettingsProvider>
  </StrictMode>,
);
