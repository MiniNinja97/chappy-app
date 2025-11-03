import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

const LS_KEY_JWT = "jwt";
const LS_KEY_GUEST = "guestId";

type DmMessage = {
  PK: string;           // "MSG#A#B"
  SK: string;           // "Timestamp#..."
  content: string;
  senderId: string;
  receiverId: string;
  type: "MESSAGE";
};

function getJwtUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Viktigt: fältet heter userId med versalt I
    return typeof payload?.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

function ensureGuestId(): string {
  let g = localStorage.getItem(LS_KEY_GUEST);
  if (!g) {
    g = crypto.randomUUID();
    localStorage.setItem(LS_KEY_GUEST, g);
  }
  return g;
}

export default function DmPage() {
  // Parametern heter userId i din route: /dm/:userId
  const { userId: otherId } = useParams<{ userId: string }>();

  const jwt = localStorage.getItem(LS_KEY_JWT);
  const userId = getJwtUserId(jwt);
  // min identitet: registrerad user eller gästprefix
  const myId = userId ?? `GUEST#${ensureGuestId()}`;

  // ---- State: rätt typer ----
  const [allMessages, setAllMessages] = useState<DmMessage[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>("");

  const loadMessages = useCallback(async () => {
    if (!otherId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:1337/api/messages");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Kunde inte hämta meddelanden");
        setAllMessages([]);
        return;
      }
      const data = (await res.json()) as DmMessage[];
      setAllMessages(Array.isArray(data) ? data : []);
    } catch {
      setError("Nätverksfel, försök igen");
      setAllMessages([]);
    } finally {
      setLoading(false);
    }
  }, [otherId]);

  // Konversationen mellan mig och den valda användaren
  const convo = useMemo<DmMessage[]>(() => {
    if (!otherId) return [];
    return allMessages
      .filter(
        (m) =>
          (m.senderId === myId && m.receiverId === otherId) ||
          (m.senderId === otherId && m.receiverId === myId)
      )
      .sort((a, b) => String(a.SK).localeCompare(String(b.SK)));
  }, [allMessages, myId, otherId]);

  useEffect(() => {
    loadMessages();
    const onFocus = () => loadMessages();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadMessages]);

  // ——— Skicka meddelande ———
  async function handleSend() {
    if (!otherId) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      // Typa headers
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (jwt) headers.Authorization = `Bearer ${jwt}`; // utan kolon

      // Typa body utan any
      type BodyWithJwt = { content: string; receiverId: string };
      type BodyGuest = BodyWithJwt & { guestId: string };

      const base: BodyWithJwt = { content: trimmed, receiverId: otherId };
      const body: BodyWithJwt | BodyGuest = jwt
        ? base
        : { ...base, guestId: localStorage.getItem(LS_KEY_GUEST) ?? ensureGuestId() };

      const res = await fetch("http://localhost:1337/api/messages", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Kunde inte skicka meddelande");
        return;
      }

      setContent("");
      await loadMessages();
    } catch {
      setError("Nätverksfel, försök igen");
    }
  }

  return (
    <section>
      <h2>Direktmeddelanden</h2>
      {loading && <p>Laddar…</p>}
      {error && !loading && <p>{error}</p>}

      {!loading && !error && (
        <>
          <ul>
            {convo.map((m) => (
              <li key={m.SK}>
                <strong>{m.senderId === myId ? "Du" : "Hen"}:</strong> {m.content}
              </li>
            ))}
            {convo.length === 0 && <li>Inga meddelanden ännu.</li>}
          </ul>

          <div>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv ett meddelande…"
            />
            <button type="button" onClick={handleSend}>Skicka</button>
          </div>
        </>
      )}
    </section>
  );
}
