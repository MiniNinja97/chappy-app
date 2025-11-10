import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./zustandStorage";

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
}

interface RegisterSuccessResponse {
  message: string;
  token?: string;
  success?: boolean;
}

export default function Register() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const setJwt = useAuthStore((s) => s.setJwt);

  async function handleSubmitRegister() {
    setError("");

    // Grundläggande validering
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Fyll i både användarnamn och lösenord.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    try {
      const response = await fetch("/api/register/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Kunde inte registrera användare.");
        return;
      }

      const data: RegisterSuccessResponse = await response.json();

      // Om backend skickar med en token vid registrering kan vi lägga den i Zustand 
     
      if (data.token) {
        setJwt(data.token);
      }

      // Skicka användaren till login efter lyckad registrering
      navigate("/login");
    } catch {
      setError("Nätverksfel. Försök igen.");
    }
  }

  return (
    <div className="register-form">
      <h1>Skapa konto</h1>

      <div className="register-field">
        <label htmlFor="username">Användarnamn</label>
        <input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
        />

        <label htmlFor="password">Lösenord</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />

        <label htmlFor="confirmPassword">Upprepa lösenord</label>
        <input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
        />
      </div>

      {error && (
        <p className="register-error" role="alert">
          {error}
        </p>
      )}

      <div className="register-actions">
        <button type="button" onClick={handleSubmitRegister}>
          Registrera dig
        </button>
      </div>
    </div>
  );
}
