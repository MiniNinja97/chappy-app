import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "./zustandStorage";
import "./styles/login.css";

interface FormData {
  username: string;
  password: string;
}

interface LoginSuccessResponse {
  message: string;
  token: string;
  user: {
    userId: string;
    username: string;
    accessLevel?: string;
    type?: string;
  };
}

export default function Login() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  //  Hämta Zustand-funktionerna
  const setJwt = useAuthStore((s) => s.setJwt);
  const clearJwt = useAuthStore((s) => s.clearJwt);
  const clearGuestId = useAuthStore((s) => s.clearGuestId);
  const setGuestId = useAuthStore((s) => s.setGuestId);

  async function handleSubmitLogin() {
    setError("");

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Fyll i både användarnamn och lösenord.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.status !== 200) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Felaktigt användarnamn eller lösenord.");
        return;
      }

      const data: LoginSuccessResponse = await response.json();

      // Spara token i Zustand
      setJwt(data.token);

      clearGuestId();

      navigate("/frontPage");
    } catch {
      setError("Nätverksfel. Försök igen.");
    }
  }

  function handleGuest() {
    clearJwt();
    setGuestId(crypto.randomUUID());
    navigate("/frontPage");
  }

  return (
    <div className="login-form">
      <h1>Chappy App</h1>

      <div className="login-field">
        <input
          placeholder="Username"
          id="username"
          type="text"
          value={formData.username}
          autoComplete="username"
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
        />

        <input
          placeholder="Password"
          id="password"
          type="password"
          value={formData.password}
          autoComplete="current-password"
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
      </div>

      {error && (
        <p className="login-error">
          {error}
        </p>
      )}

      <div className="login-actions">
        <button type="button" onClick={handleSubmitLogin}>
          Logga in
        </button>
        <button type="button" onClick={handleGuest}>
          Fortsätt som gäst
        </button>
        <Link className="link" to="/register">
          No account? Get registerd here!
        </Link>
      </div>
    </div>
  );
}
