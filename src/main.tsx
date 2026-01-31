import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { NativelySafeAreaProvider } from "./components/NativelySafeAreaProvider";

createRoot(document.getElementById("root")!).render(
  <NativelySafeAreaProvider>
    <App />
    <UpdateNotification />
  </NativelySafeAreaProvider>
);
