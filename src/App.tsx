import { Outlet, useLocation } from "react-router-dom";
import MenuBar from "./components/menuBar";
import "./App.css";

export default function App() {
  const location = useLocation();

  
  const hideMenu = /^\/(?:login|register)?$/.test(location.pathname);

  return (
    <div className="app">
      <main className={hideMenu ? "" : "has-menu"}>
        <Outlet />
      </main>

      {!hideMenu && <MenuBar />}
    </div>
  );
}



