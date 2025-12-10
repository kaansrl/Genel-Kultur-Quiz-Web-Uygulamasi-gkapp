// src/pages/Home.js
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Home() {
  const { user } = useAuth();

  // 🔓 Giriş yapmamış kullanıcı
  if (!user) {
    return (
      <div className="container center">
        <div className="card hero">
          <h1 className="h1">🎮 Genel Kültür Arenasına Hoş Geldin!</h1>
          <p className="h2">
            Günlük quizlerle <strong>XP</strong> kazan, rozet topla, seviyeni yükselt.
          </p>

          <div className="btn-row">
            <Link to="/login" className="btn">
              Giriş Yap
            </Link>
            <Link to="/register" className="btn secondary">
              Hemen Kayıt Ol
            </Link>
          </div>

          <div className="hero-hint">
            Ücretsiz başla • İstediğin zaman devam et
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Giriş yapmış kullanıcı
  return (
    <div className="container center">
      <div className="card hero">
        {/* Üst küçük slogan */}
        <h2
          className="h2"
          style={{
            letterSpacing: ".18em",
            textTransform: "uppercase",
            fontSize: "0.9rem",
            opacity: 0.8,
            marginBottom: "6px",
          }}
        >
          
        </h2>

        {/* Ana başlık */}
        <h1 className="welcome-title">
  Genel Kültür Uygulamasına Hoş Geldin!
</h1>


        {/* Meydan okuma cümlesi */}
        <p className="home-subtitle">Bugünkü meydan okumaya var mısın?</p>


        {/* Üstte: Aktif Bilgi + Günün 6 Bilgisi */}
        <div className="btn-row" style={{ marginTop: "22px" }}>
          <Link to="/bilgiler/aktif" className="btn secondary">
            Aktif Bilgi
          </Link>
          <Link to="/bilgiler/gunluk" className="btn secondary">
            Günün 6 Bilgisi
          </Link>
        </div>

        {/* Altta: büyük Quiz butonu */}
        <div
          className="btn-row"
          style={{ marginTop: "18px", justifyContent: "center" }}
        >
          <Link to="/quiz" className="btn">
            Quiz&apos;e Başla
          </Link>
        </div>

        {/* Alt minik yazı */}
        <div className="hero-hint" style={{ marginTop: "18px" }}>
          
        </div>
      </div>
    </div>
  );
}
