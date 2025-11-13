import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore, selectJwt } from "./zustandStorage";
import './styles/channelsChat.css';



type ChannelMeta = {
  PK: string;
  SK: "CHANNELMETA";
  type: "CHANNEL";
  channelId: string;
  channelName: string;
  access: "public" | "locked" | string; // tillåt både öppna och låsta
  creatorId: string;
  creatorPK: string;
  description?: string | null;
};

type ChannelMessageItem = {
  PK: string;
  SK: string;
  type: "MESSAGE";
  receiverId: string; // channelId
  senderId: string; // userId
  content: string;
};

type ChannelGetResponse = {
  channel: ChannelMeta;
  messages: ChannelMessageItem[];
};

export default function ChannelChat() {
  const { channelId } = useParams<{ channelId: string }>();
  const [messages, setMessages] = useState<ChannelMessageItem[]>([]);
  // tom array betyder "inga meddelanden än"
  const [input, setInput] = useState<string>("");
  const [channel, setChannel] = useState<ChannelMeta | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const jwt = useAuthStore(selectJwt);

  const socketRef = useRef<Socket | null>(null); // håller socket-anslutningen mellan renders

  // Hämta kanalens historik
  useEffect(() => {
    let active = true;

    //  hämtar kanalinfo och tidigare meddelanden från API,
    async function fetchHistory() {
      if (!channelId) return;
      setError("");
      setLoading(true);

      try {
        // Försök först utan JWT
        let res = await fetch(`/api/channel-messages/${channelId}`);

        // Om servern säger 401 och vi har JWT — försök igen med token
        if (res.status === 401 && jwt) {
          res = await fetch(`/api/channel-messages/${channelId}`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });
        }

        if (!res.ok) {
          const body: { message?: string } | null = await res
            .json()
            .catch(() => null);
          throw new Error(body?.message ?? "Kunde inte hämta chatmeddelanden");
        }

        const data: ChannelGetResponse = await res.json();
        if (!active) return;

        setChannel(data.channel);
        const sorted = [...data.messages].sort((a, b) =>
          a.SK.localeCompare(b.SK)
        );
        setMessages(sorted);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ett fel har inträffat");
        //  instanceof kollar att e verkligen är ett error-objekt
      } finally {
        setLoading(false);
      }
    }

    void fetchHistory();
    return () => {
      active = false;
    };
  }, [channelId, jwt]);

  // skapa anslutning, gå med i kanal, ta emot och lämna
  useEffect(() => {
    if (!channelId) return;

    // skapa en ny socketinstans
    // Anslut mot samma origin (Vite kör på 5173, proxas till 1337 via vite.config.ts)
    const s: Socket = io("/", {
      withCredentials: true,
      path: "/socket.io", // måste matcha server.ts och vite-proxy

      // låt Socket.IO sköta transports automatiskt (polling → websocket)
    });

    socketRef.current = s;

    const onConnect = () => {
      s.emit("channel:join", { channelId });
    };

    //  hanterare för inkommande kanalmeddelanden med socket
    //  Lägger bara till meddelandet om det gäller nuvarande kanal
    const onChannelMessage = (payload: {
      channelId: string;
      msg: ChannelMessageItem;
    }) => {
      if (payload.channelId === channelId) {
        setMessages((prev) => {
          //  prev är tidigare meddelanden, returnerar ny lista med det nya på slutet
          const exists = prev.some(
            (m) => m.SK === payload.msg.SK && m.content === payload.msg.content
          );
          return exists ? prev : [...prev, payload.msg]; // undvik dubbla nycklar
        });
      }
    };

    const onConnectError = (err: unknown) => {
      console.error("socket connect_error:", err);
    };

    // nedan registreras event/användare på socketen och i cleanup tas de bort
    // connect när socketen ansluter, channel:message - när servern skicar nytt meddelande
    s.on("connect", onConnect);
    s.on("channel:message", onChannelMessage);
    s.on("connect_error", onConnectError);

    return () => {
      s.emit("channel:leave", { channelId }); // tala om för servern att vi lämnar kanalen
      s.off("channel:message", onChannelMessage); // avregistrera användare för att undvika dubbletter
      s.off("connect", onConnect); // avregistrera connect-handler
      s.off("connect_error", onConnectError); // avregistrera error-handler
      s.disconnect(); // stäng anslutningen när komponenten tas bort
      socketRef.current = null;
    };
  }, [channelId]);

  // Bestäm om man får skriva i kanalen:
  const isGuest = !jwt;
  const isLocked = channel?.access === "locked";
  const canWrite = !isLocked || (isLocked && !isGuest);

  //  submit-handlern för formuläret. Stoppar default reload, validerar input
  //       POST till API:et, skapar ett meddelande, uppdaterar state och skickar med socket
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || !channelId) return;

    // Om kanalen är låst och användaren inte är inloggad → avbryt
    if (!canWrite) {
      setError("Den här kanalen är låst. Logga in för att skriva.");
      return;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Skicka JWT endast om det finns och kanalen är låst
      if (jwt && isLocked) {
        headers.Authorization = `Bearer ${jwt}`;
      }

      const res = await fetch(`/api/channel-messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ channelId, content: input.trim() }),
      });

      if (!res.ok) {
        const body: { message?: string } | null = await res
          .json()
          .catch(() => null);
        throw new Error(body?.message ?? "Kunde inte skicka meddelandet");
      }

      const nowISO = new Date().toISOString(); // skapar tidsstämpel i ISO
      const newMsg: ChannelMessageItem = {
        PK: `CHANNELMSG#${channelId}`,
        SK: `Timestamp#${nowISO}`,
        type: "MESSAGE",
        receiverId: channelId,
        senderId: "me", // placeholder, servern sparar rätt userId
        content: input.trim(),
      };

      // lägg till meddelandet direkt på skärmen
      setMessages((prev) => {
        const exists = prev.some(
          (m) => m.SK === newMsg.SK && m.content === newMsg.content
        );
        return exists ? prev : [...prev, newMsg];
      });

      socketRef.current?.emit("channel:message", { channelId, msg: newMsg }); //skickar ett event till servern med namnet "channel:message". "emit" = sänd ett namngivet event med data
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel inträffade");
    }
  }

  if (loading) return <p>Laddar kanal…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!channel) return <p>Kanalen hittades inte.</p>;

  return (
  <div className="chat-container">
    <h1>
      Chat – {channel.channelName} {channel.access === "locked" ? "🔒" : ""}
    </h1>

   
    <div className="chat">
      {messages.length === 0 && <p>Inga meddelanden än</p>}
      {messages.map((m, i) => {
        
        const mine = m.senderId === "me"; 

        return (
          <div
            key={`${m.SK}-${i}`}
            className={`bubble ${mine ? "me" : "other"}`}
          >
            <p>{m.content}</p>
          </div>
        );
      })}
    </div>

    
    <form onSubmit={handleSubmit} className="chat-form">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={!canWrite ? "Not public" : "Write something..."}
        className="chat-input"
        disabled={!canWrite}
      />
      <button
        type="submit"
        className="chat-button"
        disabled={!canWrite || !input.trim()}
      >
        Skicka
      </button>
    </form>
  </div>
);
}

