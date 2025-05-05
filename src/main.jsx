import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { AliveScope } from "react-activation";  // Import AliveScope

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AliveScope>  {/* Wrap your App component with AliveScope */}
        <App />
      </AliveScope>
    </BrowserRouter>
  </React.StrictMode>
);
