import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Failed to find the root element. Ensure there is a <div id='root'></div> in your HTML."
  );
}

createRoot(rootElement).render(<App />);
