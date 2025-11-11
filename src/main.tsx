import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import "./App.css";

import Login from "./components/login";
import FrontPage from "./components/frontPage";

import Register from "./components/register";
import dmPage from "./components/dmPage";
import channelsPage from "./components/channelsPage";
import ChannelChat from "./components/ChannelChat";
import Settings from "./components/settings";

const router = createHashRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: Login },
      { path: "login", Component: Login },
      { path: "frontPage", Component: FrontPage },
      { path: "register", Component: Register },
      { path: "dm/:userId", Component: dmPage },
      { path: "channels", Component: channelsPage },
      { path: "channels/:channelId", Component: ChannelChat },
      { path: "settings", Component: Settings },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
