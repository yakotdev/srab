if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error("GLOBAL ERROR DETECTED:", e.error);
    const d = document.createElement('div');
    d.style.position = 'fixed';
    d.style.top = '0'; d.style.left = '0'; d.style.zIndex = '999999';
    d.style.background = 'red'; d.style.color = 'white'; d.style.padding = '20px';
    d.innerHTML = '<h2>CRASH:</h2><pre>' + (e.error?.stack || e.message) + '</pre>';
    document.body.appendChild(d);
  });
}
