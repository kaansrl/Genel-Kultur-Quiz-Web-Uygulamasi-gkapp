// src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { logout } from "../Api";
import { getLevelInfo } from "../levelUtils";

export default function Navbar() {
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const xp = user?.xp ?? 0;
  const levelInfo = getLevelInfo ? getLevelInfo(xp) : null;

  return (
    <nav className="nav">
      <div className="nav-inner" style={{ display: "flex", alignItems: "center" }}>
        
        {/* Sol: Logo + Seviye Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/" className="brand">
            GK-App
          </Link>

          {user && levelInfo && (
            <div className="nav-level" style={{ width: 160 }}>
              <div className="nav-level-text">
                <span>{levelInfo.current.name}</span>
                <span>
                  {levelInfo.next ? `${xp}/${levelInfo.next.minXp} XP` : `${xp} XP`}
                </span>
              </div>
              <div className="nav-level-bar">
                <div
                  className="nav-level-fill"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Orta bölüm: linkler */}
        {user && (
          <div className="nav-links" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <Link to="/bilgiler/aktif">Aktif Bilgi</Link>
            <Link to="/bilgiler/gunluk">Günlük 6 Bilgi</Link>
            <Link to="/quiz">Günün Quiz'i</Link>
            <Link to="/istatistik">İstatistiklerim</Link>
          </div>
        )}

        {/* Sağ: Kullanıcı adı + Çıkış */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="nav-user">Merhaba {user.kullanici_adi}</span>
            <button className="btn secondary" onClick={handleLogout}>
              Çıkış
            </button>
          </div>
        )}

        {!user && (
          <div className="nav-links" style={{ marginLeft: "auto" }}>
            <Link to="/login">Giriş</Link>
            <Link to="/register">Kayıt</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
