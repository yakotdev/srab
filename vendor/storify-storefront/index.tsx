import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function mountApp() {
  const rootElement = document.getElementById('storify-storefront-root');
  if (!rootElement) {
    throw new Error('Could not find root element to mount to');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

function whenBootstrapReady() {
  const win = window as Window & { __BOOTSTRAP__?: { theme?: unknown } };
  if (win.__BOOTSTRAP__?.theme) {
    mountApp();
    return;
  }

  let mounted = false;
  const tryMount = () => {
    if (mounted) return;
    mounted = true;
    mountApp();
  };

  window.addEventListener('storify:bootstrap-ready', tryMount, { once: true });
  window.setTimeout(tryMount, 2500);
}

whenBootstrapReady();
