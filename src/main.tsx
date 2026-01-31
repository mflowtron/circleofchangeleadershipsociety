import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { NativelySafeAreaProvider } from "./components/NativelySafeAreaProvider";

// Note: All viewport compensation logic is now centralized in NativelySafeAreaProvider
// to avoid conflicts between multiple monitors.

createRoot(document.getElementById("root")!).render(
  <NativelySafeAreaProvider>
    <App />
    <UpdateNotification />
  </NativelySafeAreaProvider>
);
