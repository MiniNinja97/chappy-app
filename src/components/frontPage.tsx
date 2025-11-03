

import { useEffect, useState, useCallback } from "react";


export interface User {
  userId: string;
  username: string;
  accessLevel: string;
  type: "USER";
}


export default function FrontPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const loadUsers = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:1337/api/users");
      if(!res.ok) {
        const body = await res.json().catch(() => null); //ska kolla varfrö null och om jag kan ha send och inte json
        setError(body?.message ?? "Kunde inte hämta användare");
        setUsers([]);
        return;
      }

      const data = (await res.json()) as User[];// måste kolla upp att as är korrekt

      const registeredOnly = data.filter(
        (u) => u.type === "USER" && u.accessLevel === "user"
      );

      setUsers(registeredOnly);
    } catch {
      setError("Nätverksfel. Försök igen");
      setUsers([]);

    }finally {
      setLoading(false);
    }
  }, []); //kolla upp vad finally betyder och varför det är en tom array i slutet

  useEffect(() => {
    loadUsers();
    const onFocus = () => loadUsers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadUsers]);




  return (
    <section>
      <h1>Välkommen till Chappy App</h1>
      {loading && <p>Laddar användare...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && (
        <ul>
          {users.map((u) => (
            <li key={u.userId}>{u.username}</li>
          ))}
        </ul>
      )}
    </section>
  );
}



