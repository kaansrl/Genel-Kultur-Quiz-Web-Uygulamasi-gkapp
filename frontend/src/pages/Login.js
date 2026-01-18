// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  // ⬇️ Artık sadece AuthContext'ten login fonksiyonunu alıyoruz
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // ⬇️ DOĞRUDAN backend'e gitmek yerine AuthContext.login kullan
      const user = await login(email, parola);

      console.log("DEBUG Login page - user from AuthContext.login:", user);

      // Giriş başarılı → ana sayfaya yönlendir
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      // AuthContext.login hata durumunda Error fırlatıyor
      setError(err.message || "Giriş başarısız, lütfen tekrar dene.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container center">
      <div className="card hero" style={{ maxWidth: 480, width: "100%" }}>
        <h1 className="h1">Giriş Yap</h1>
        <p className="h2">Hesabınıza giriş yapın</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="form-group">
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: 8 }}>
            <input
              type="password"
              placeholder="Parola"
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            className="btn"
            style={{ marginTop: 16 }}
            disabled={submitting}
          >
            {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {error && (
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#ff8080",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}