

import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";


export interface User {
  userId: string;
  username: string;
  accessLevel: string;
  type: "USER";
}

const LS_KEY = "jwt";

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

  const me = getUserIdFromJWT(localStorage.getItem(LS_KEY));
  const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:1337/api/users");
      if(!res.ok) {
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
      setUsers(me ? registeredOnly.filter(u => u.userId !== me) : registeredOnly);
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


const isLoggedIn = Boolean(localStorage.getItem(LS_KEY));

  return (
    <section>
      <h1>Välkommen till Chappy App</h1>
      {loading && <p>Laddar användare...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && (
        <ul>
  {users.map((u) => (
    <li key={u.userId}>
      {isLoggedIn ? (
        <Link to={`/dm/${u.userId}`}>{u.username}</Link>
      ) : (
        <button
          type="button"
          disabled
          title="Logga in för att skicka DM"
          style={{
            opacity: 0.5,
            cursor: "not-allowed",
            background: "none",
            border: "none",
            color: "inherit",
          }}
        >
          {u.username}
        </button>
      )}
    </li>
  ))}
  {users.length === 0 && <li>Inga registrerade användare ännu.</li>}
</ul>
      )}
      <button type="button" onClick={() => navigate("/channels")}>Visa kanaler</button>
    </section>
  );
}




