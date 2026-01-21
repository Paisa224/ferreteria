import React from "react";
import ReactDOM from "react-dom/client";
import "./style/styles.css";
import AppRouter from "./routing/AppRouter";
import { useAuthStore } from "./auth/auth.store";

function Boot() {
  React.useEffect(() => {
    useAuthStore
      .getState()
      .loadMe()
      .catch(() => {});
  }, []);

  return <AppRouter />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boot />
  </React.StrictMode>,
);
