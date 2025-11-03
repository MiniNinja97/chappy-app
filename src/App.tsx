import { Outlet } from "react-router-dom";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      
      <main>
        <Outlet />
      </main>
    </div>
  );
}
