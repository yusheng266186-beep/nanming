import { createRoot } from "react-dom/client";
import App from "./JourneyApp.js";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("APP_ROOT_MISSING");
createRoot(root).render(<App />);
