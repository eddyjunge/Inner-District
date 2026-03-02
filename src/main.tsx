import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ConvexReactClient } from "convex/react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import App from "./App";
import "./styles.css";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("Missing VITE_CONVEX_URL");

const WORKOS_CLIENT_ID = import.meta.env.VITE_WORKOS_CLIENT_ID;
if (!WORKOS_CLIENT_ID) throw new Error("Missing VITE_WORKOS_CLIENT_ID");

const convex = new ConvexReactClient(CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthKitProvider clientId={WORKOS_CLIENT_ID}>
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  </React.StrictMode>,
);
