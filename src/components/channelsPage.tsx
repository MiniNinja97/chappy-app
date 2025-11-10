import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";


import {
  useAuthStore,
  selectJwt,
  selectIsLoggedIn,
} from "./zustandStorage";

type ChannelItem = {
  PK: string;
  SK: "CHANNELMETA";
  type: "CHANNEL";
  channelId: string;
  channelName: string;
  access: "public" | "locked";
  creatorId: string;
  creatorPK: string;
  description?: string | null;
};

type CreateChannelForm = {
  name: string;
  description: string;
  access: "public" | "locked";
};

// const LS_KEY_JWT = "jwt"; // (tidigare) nyckeln som används i localStorage för att spara/hämta JWT-token

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [form, setForm] = useState<CreateChannelForm>({
    name: "",
    description: "",
    access: "public",
  });

  const navigate = useNavigate();

 
  const jwt = useAuthStore(selectJwt);
  const isLoggedIn = useAuthStore(selectIsLoggedIn);

  //  loadChannels hämtar kanal-listan från API:t, sätter loading/error och uppdaterar state,  useCallback ser till att funktionen behåller samma referens mellan renders
  const loadChannels = useCallback(async (): Promise<void> => {
    setError("");
    setLoading(true);
    try {
      const res: Response = await fetch("/api/channels");
      if (!res.ok) {
        const body: { message?: string } | null = await res
          .json()
          .catch(() => null);
        setError(body?.message ?? "Kunde inte hämta kanaler");
        setChannels([]);
        return;
      }
      const data: unknown = await res.json();
      if (Array.isArray(data)) {
        setChannels(data as ChannelItem[]);
      } else {
        setChannels([]);
      }
    } catch {
      setError("Nätverksfel. Försök igen.");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  //  useEffect körs vid mount, när loadChannels-referensen ändras.Hämtar kanaler direkt (void loadChannels()).
  // Lägger till en focus på window som laddar om listan varje gång
  //cleanup tas lyssnaren bort för att undvika dubbla anrop.
  useEffect(() => {
    void loadChannels();
    const onFocus = (): void => {
      void loadChannels();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadChannels]);

  async function handleCreateChannel(): Promise<void> {
    if (!isLoggedIn) return; // extra skydd

    setError("");
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name || !description) {
      setError("Fyll i både namn och beskrivning.");
      return;
    }

    //  setCreating(true) signalerar att skapandet pågår.
    setCreating(true);
    try {
      const res: Response = await fetch("/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ name, description, access: form.access }),
      });

      if (!res.ok) {
        const body: { message?: string } | null = await res
          .json()
          .catch(() => null);
        setError(body?.message ?? "Kunde inte skapa kanal.");
        return;
      }

      await res.json();
      setForm({ name: "", description: "", access: "public" });
      void loadChannels();
    } catch {
      setError("Nätverksfel. Försök igen.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section>
      <h2>Kanaler</h2>

      <div>
        <button type="button" onClick={() => navigate("/frontPage")}>
          ⬅ Till användare
        </button>
      </div>

      <div>
        <h3>Skapa ny kanal</h3>

        <div>
          <label htmlFor="channel-name">Namn</label>
          <input
            id="channel-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={!isLoggedIn}
          />
        </div>

        <div>
          <label htmlFor="channel-desc">Beskrivning</label>
          <input
            id="channel-desc"
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!isLoggedIn}
          />
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <input
            id="channel-access"
            type="checkbox"
            checked={form.access === "public"}
            onChange={(e) =>
              setForm({
                ...form,
                access: e.target.checked ? "public" : "locked",
              })
            }
            disabled={!isLoggedIn}
          />
          <label htmlFor="channel-access" style={{ marginLeft: "0.5rem" }}>
            Öppen kanal (gäster kan se)
          </label>
        </div>

        <button
          type="button"
          onClick={handleCreateChannel}
          disabled={!isLoggedIn || creating}
          title={!isLoggedIn ? "Logga in för att skapa kanaler" : ""}
          style={{ marginTop: "0.5rem" }}
        >
          {creating ? "Skapar…" : "Skapa kanal"}
        </button>
      </div>

      {loading && <p>Laddar kanaler…</p>}
      {error && !loading && <p role="alert">{error}</p>}

      {!loading && !error && (
        <ul>
          {channels.map((c) => {
            const isLocked = c.access === "locked";
            
            const disabled = isLocked && !isLoggedIn;

            return (
              <li key={c.channelId}>
                {disabled ? (
                  <button type="button" disabled title="Låst kanal">
                    {c.channelName}
                  </button>
                ) : (
                  <Link to={`/channels/${c.channelId}`}>
                    {c.channelName} {isLocked}
                  </Link>
                )}
              </li>
            );
          })}
          {channels.length === 0 && <li>Inga kanaler ännu.</li>}
        </ul>
      )}
    </section>
  );
}
