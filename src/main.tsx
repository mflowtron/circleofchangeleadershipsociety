import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { warmNativeCache } from "./utils/nativelyCache";

// Warm cache in background after render (for native app context)
warmNativeCache().catch(console.debug);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <UpdateNotification />
  </>
);
