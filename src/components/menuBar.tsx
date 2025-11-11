import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, selectIsLoggedIn } from "./zustandStorage"; // om du använder detta för inloggning
import './styles/menyBar.css';


export default function MenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = useAuthStore(selectIsLoggedIn);


  // true om vi är på frontPage
  const onFrontPage = location.pathname === "/frontPage";

  return (
    <nav className="menu-bar">
        <div className="menu-box">
      <button
        type="button"
        onClick={() => navigate("/frontPage")}
        disabled={onFrontPage}
        title={onFrontPage ? "Du är redan på startsidan" : "Gå till startsidan"}
      >
        Home
      </button>

      <button type="button" onClick={() => navigate("/channels")}>
        Channels
      </button>

      <button
        type="button"
        onClick={() => navigate("/settings")}
        disabled={!isLoggedIn}
        title={!isLoggedIn ? "Logga in för att se dina kanaler" : ""}
      >
        Setting
      </button>
      </div>
    </nav>
  );
}
