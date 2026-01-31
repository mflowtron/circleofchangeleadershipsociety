import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { NativelySafeAreaProvider } from "./components/NativelySafeAreaProvider";

// Global fullscreen exit monitor for Natively app
// This catches viewport anomalies at the earliest point possible
if (typeof window !== 'undefined' && 'visualViewport' in window) {
  let lastOffsetTop = 0;
  
  const handleViewportAnomaly = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    
    // Detect sudden appearance of viewport offset (likely fullscreen exit)
    if (vv.offsetTop > 10 && lastOffsetTop <= 10) {
      console.debug('[GlobalViewportMonitor] Detected viewport offset spike:', vv.offsetTop);
      
      // Multi-pass reset
      const resetViewport = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.dispatchEvent(new Event('natively:refresh-insets'));
      };
      
      setTimeout(resetViewport, 50);
      setTimeout(resetViewport, 150);
      setTimeout(resetViewport, 300);
    }
    
    lastOffsetTop = vv.offsetTop;
  };
  
  window.visualViewport?.addEventListener('resize', handleViewportAnomaly);
}

createRoot(document.getElementById("root")!).render(
  <NativelySafeAreaProvider>
    <App />
    <UpdateNotification />
  </NativelySafeAreaProvider>
);
