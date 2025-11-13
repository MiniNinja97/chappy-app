import { useEffect, useState, useCallback } from "react";
import { Link,  } from "react-router-dom";
import { useAuthStore, selectJwt, selectIsLoggedIn } from "./zustandStorage";
import './styles/frontpage.css';

export interface User {
  userId: string;
  username: string;
  accessLevel: string;
  type: "USER";
}

// liten hjälpfunktion för att plocka userId från JWT
function getUserIdFromJWT(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload?.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export default function FrontPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Ersätter localStorage
  const jwt = useAuthStore(selectJwt);
  const isLoggedIn = useAuthStore(selectIsLoggedIn);

  //  avkoda userId från JWT, om användaren är inloggad
  const me = getUserIdFromJWT(jwt);

  // const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Kunde inte hämta användare");
        setUsers([]);
        return;
      }

      const data = (await res.json()) as User[];
      const registeredOnly = data.filter(
        (u) => u.type === "USER" && u.accessLevel === "user"
      );

      //  visa inte mig själv/användaren som är inloggad i listan
      setUsers(
        me ? registeredOnly.filter((u) => u.userId !== me) : registeredOnly
      );
    } catch {
      setError("Nätverksfel. Försök igen");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    loadUsers();
    const onFocus = () => loadUsers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadUsers]);

  return (
    <section className="user-section">
  <h1>Friends</h1>

  {loading && <p>Laddar användare...</p>}
  {error && <p>{error}</p>}

  {!loading && !error && (
    <ul className="user-grid">
      {users.map((u) => (
        <li key={u.userId}>
          {isLoggedIn ? (
            <Link to={`/dm/${u.userId}`} className="user-card">
              <p>{u.username}</p>
            </Link>
          ) : (
            <div
              className="user-card disabled"
              title="Logga in för att skicka DM"
            >
              <p>{u.username}</p>
            </div>
          )}
        </li>
      ))}
      {users.length === 0 && <li>No other registerd users</li>}
    </ul>
  )}

  {/* <div className="user-actions">
    <button type="button" onClick={() => navigate("/channels")}>
      Visa kanaler
    </button>
    <button
      type="button"
      onClick={() => navigate("/settings")}
      disabled={!isLoggedIn}
      title={!isLoggedIn ? "Logga in för att se dina kanaler" : ""}
    >
      Inställningar
    </button>
  </div> */}
</section>

  );
}

