import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app";


// ============================================================
// React Application Entry Point
// ============================================================

ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <React.StrictMode>

        <App />

    </React.StrictMode>
);