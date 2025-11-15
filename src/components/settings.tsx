import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore, selectJwt, selectIsLoggedIn } from "./zustandStorage";
import "./styles/settings.css";

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

export default function SettingsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountDeleting, setAccountDeleting] = useState<boolean>(false);

  const navigate = useNavigate();

  // JWT och inloggningsstatus från Zustand
  const jwt = useAuthStore(selectJwt);
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const clearJwt = useAuthStore((s) => s.clearJwt);

  
  useEffect(() => {
    if (!isLoggedIn) navigate("/frontPage", { replace: true });
  }, [isLoggedIn, navigate]);

  // Hämta alla kanaler som den inloggade användaren skapat
  const loadMine = useCallback(async () => {
    if (!isLoggedIn || !jwt) return;

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/channels/mine", {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.status === 401) {
        // token saknas/ogiltig → logga ut
        clearJwt();
        navigate("/frontPage", { replace: true });
        return;
      }

      if (!res.ok) {
        const body: { message?: string } | null = await res
          .json()
          .catch(() => null);
        setError(body?.message ?? "Kunde inte hämta dina kanaler");
        setChannels([]);
        return;
      }

      const data = (await res.json()) as ChannelItem[];
      setChannels(
        [...data].sort((a, b) => a.channelName.localeCompare(b.channelName))
      );
    } catch {
      setError("Nätverksfel. Försök igen.");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, jwt, navigate, clearJwt]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadMine();
    const onFocus = () => void loadMine();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadMine, isLoggedIn]);

  // Ta bort kanal
  async function handleDeleteChannel(channelId: string) {
    if (!isLoggedIn || !jwt) return;

    setDeletingId(channelId);
    setError("");
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.status === 401) {
        clearJwt();
        navigate("/frontPage", { replace: true });
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      await loadMine();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Okänt fel";
      setError(`Kunde inte ta bort kanal: ${message}`);
    } finally {
      setDeletingId(null);
    }
  }

  // Radera konto
  async function handleDeleteAccount() {
    if (!isLoggedIn || !jwt) return;

    setAccountDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Logga ut lokalt och skicka till login
      clearJwt();
      navigate("/login", { replace: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Okänt fel";
      setError(`Kunde inte radera konto: ${message}`);
    } finally {
      setAccountDeleting(false);
    }
  }

  if (!isLoggedIn) return null;

  return (
    <section>
      <h2>My settings</h2>

      {/* <div style={{ marginBottom: "0.5rem" }}>
        <button type="button" onClick={() => navigate("/frontPage")}>
          ⬅ Till startsidan
        </button>
      </div> */}

      {loading && <p>Laddar dina kanaler…</p>}
      {error && !loading && <p role="alert">{error}</p>}

      {!loading && !error && (
        <>
          <ul className="channel-list">
            {channels.map((c) => (
              <li
                key={c.channelId}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Link to={`/channels/${c.channelId}`}>
                  {c.channelName} {c.access === "locked"}
                </Link>

                <button
                  type="button"
                  onClick={() => handleDeleteChannel(c.channelId)}
                  disabled={deletingId === c.channelId}
                >
                  {deletingId === c.channelId ? "Tar bort…" : "Ta bort"}
                </button>
              </li>
            ))}
            {channels.length === 0 && (
              <li className="my-channel">You have no channels yet</li>
            )}
          </ul>

          <hr />

          <div>
            <p className="warning">Deleting your account i s permanent!!</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={accountDeleting}
            >
              {accountDeleting ? "Raderar konto…" : "Radera konto"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
