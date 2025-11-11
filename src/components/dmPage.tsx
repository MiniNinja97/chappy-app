import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore, selectJwt } from "./zustandStorage";



type DmMessage = {
  PK: string;
  SK: string;
  content: string;
  senderId: string;
  receiverId: string;
  type: "MESSAGE";
};

function getJwtUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Viktigt!! fältet heter userId med STORT I
    return typeof payload?.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export default function DmPage() {
  // Parametern heter userId i route /dm/:userId
  const { userId: otherId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Ersätter localStorage
  const jwt = useAuthStore(selectJwt);


  const guestId = useAuthStore((s) => s.guestId as string | null);
  const setGuestId = useAuthStore((s) => s.setGuestId as (id: string) => void);

  // Vi vill säkerställa att gästen får ett stabilt ID under hela sessions-livscykeln,
  // utan att skriva till localStorage. För att undvika "side-effects in render"
  // genererar vi ett temporärt ID i en ref och synkar in det till Zustand i useEffect.
  const pendingGuestIdRef = useRef<string | null>(null);
  if (!guestId && !pendingGuestIdRef.current) {
    pendingGuestIdRef.current = crypto.randomUUID();
  }
  useEffect(() => {
    if (!guestId && pendingGuestIdRef.current) {
      setGuestId(pendingGuestIdRef.current);
    }
  }, [guestId, setGuestId]);

  
  const effectiveGuestId: string | null = guestId ?? pendingGuestIdRef.current;

  // UserId från JWT om inloggad
  const userId = getJwtUserId(jwt);
  //  registrerad user eller gästanvändare
  const myId = userId ?? (effectiveGuestId ? `GUEST#${effectiveGuestId}` : "GUEST#");

  const [allMessages, setAllMessages] = useState<DmMessage[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>("");

  const loadMessages = useCallback(async () => {
    if (!otherId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) {
        const body: { message?: string } | null = await res.json().catch(() => null);
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

  // Konversationen mellan mig och användaren jag valt att skriva med
  // useMemo minns ett värde, det minskar onödig filtrering/sortering
  //  convo är den aktiva tråden mellan myId/jag som skickar meddelandet och otherId som tar emot meddelandet
  //  Returnerar tom lista om vi saknar otherId.
  
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

  // hämtar meddelanden när man kommer in i chatten/öppnar fönstret
  useEffect(() => {
    loadMessages();
    const onFocus = () => loadMessages();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadMessages]);

  // Skicka meddelande
  async function handleSend() {
    if (!otherId) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      type BodyWithJwt = { content: string; receiverId: string };
      type BodyGuest = BodyWithJwt & { guestId: string };

      const base: BodyWithJwt = { content: trimmed, receiverId: otherId };

      // Om vi inte är inloggade måste vi skicka med guestId från Zustand
      const activeGuestId = effectiveGuestId ?? crypto.randomUUID(); // fallback om något skulle saknas
      const body: BodyWithJwt | BodyGuest = jwt ? base : { ...base, guestId: activeGuestId };

      const res = await fetch("/api/messages", {
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
      <button onClick={() => navigate("/frontPage")}>⬅ Tillbaka</button>
      <h2>Messages</h2>
      {loading && <p>Laddar…</p>}
      {error && !loading && <p>{error}</p>}

      {!loading && !error && (
        <>
          <ul>
            {convo.map((m) => (
              <li key={m.SK}>
                <strong>{m.senderId === myId ? "Du" : "Hen"}:</strong>{" "}
                {m.content}
              </li>
            ))}
            {convo.length === 0 && <li>No messages </li>}
          </ul>

          <div>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something"
            />
            <button type="button" onClick={handleSend}>
              Send
            </button>
          </div>
        </>
      )}
    </section>
  );
}
