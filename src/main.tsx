import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";

import Login from "./components/login";
import FrontPage from "./components/frontPage";

import Register from "./components/register";

const router = createHashRouter([
  {
    path: "/",
    Component: App,     
    children: [
      { index: true, Component: Login },          
      { path: "login", Component: Login },        
      { path: "frontPage", Component: FrontPage },
      { path: "register", Component: Register } 
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

