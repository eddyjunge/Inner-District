import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("Missing VITE_CONVEX_URL");

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_KEY) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const convex = new ConvexReactClient(CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
