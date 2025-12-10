// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [eposta, setEposta] = useState("");
  const [parola, setParola] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({ kullanici_adi: kullaniciAdi, eposta, parola });
      // Kayıt ve otomatik login başarılı → ana sayfaya
      navigate("/");
    } catch (err) {
      // Axios hatası ise backend mesajını almaya çalış
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 409) {
          // backend zaten "E-posta zaten kayıtlı" yolluyor
          setError(data?.error || "E-posta zaten kayıtlı.");
        } else {
          setError(data?.error || "Kayıt başarısız. Lütfen tekrar deneyin.");
        }
      } else {
        setError("Kayıt başarısız. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container center">
      <div className="card auth-card">
        <h1 className="h1">Kayıt Ol</h1>
        <p className="h2">Hızlıca hesap oluştur ve devam et</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <label className="form-label">
            Kullanıcı Adı
            <input
              className="input"
              type="text"
              value={kullaniciAdi}
              onChange={(e) => setKullaniciAdi(e.target.value)}
              required
            />
          </label>

          <label className="form-label" style={{ marginTop: 12 }}>
            E-posta
            <input
              className="input"
              type="email"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              required
            />
          </label>

          <label className="form-label" style={{ marginTop: 12 }}>
            Parola
            <input
              className="input"
              type="password"
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              required
            />
          </label>

          {error && (
            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "#ffb3b3",
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ marginTop: 18, width: "100%" }}
          >
            {loading ? "Kaydediliyor..." : "Kayıt ol ve devam et"}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            fontSize: 14,
            textAlign: "center",
            opacity: 0.85,
          }}
        >
          Zaten hesabın var mı?{" "}
          <Link to="/login" className="link">
            Giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}
