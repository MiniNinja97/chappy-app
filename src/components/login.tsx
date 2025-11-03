import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const LS_KEY = "jwt";

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
  const [formData, setFormData] = useState<FormData>({ username: "", password: "" });
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  async function handleSubmitLogin() {
    setError("");

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Fyll i både användarnamn och lösenord.");
      return;
    }

    try {
      const response = await fetch("http://localhost:1337/api/auth/login", {
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
      localStorage.setItem(LS_KEY, data.token);
      localStorage.removeItem("guest");

      // Gå till startsidan
      navigate("/frontPage");
    } catch {
      setError("Nätverksfel. Försök igen.");
    }
  }

  function handleGuest() {
    localStorage.removeItem(LS_KEY);
    localStorage.setItem("guest", "true");
    navigate("/frontPage");
  }

  return (
    <div className="login-form">
      <h1>Chappy App</h1>

      <div className="login-field">
        <label htmlFor="username">Användarnamn</label>
        <input
          id="username"
          type="text"
          value={formData.username}
          autoComplete="username"
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />
      
        <label htmlFor="password">Lösenord</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          autoComplete="current-password"
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}

      <div className="login-actions">
        <button type="button" onClick={handleSubmitLogin}>
          Logga in
        </button>
        <button type="button" onClick={handleGuest}>
          Fortsätt som gäst
        </button>
        <Link to="/register">Inget konto? Registrera dig!</Link>
      </div>
    </div>
  );
}
