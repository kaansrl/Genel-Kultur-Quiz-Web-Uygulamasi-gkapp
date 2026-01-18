// src/components/Navbar.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";
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

  const linkStyle = ({ isActive }) => ({
    padding: "11px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 650,
    fontSize: 14,
    lineHeight: 1.1,
    color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.70)",
    background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
    border: isActive
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid transparent",
    transition: "all .15s ease",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  });

  return (
    <nav
      className="nav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(14px)",
        background: "rgba(12, 10, 38, 0.55)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="nav-inner"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "12px 22px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "nowrap",     // ✅ asla wrap yok
        }}
      >
        {/* Sol */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flex: "0 0 auto",
          }}
        >
          <Link
            to="/"
            className="brand"
            style={{
              fontWeight: 900,
              letterSpacing: 0.3,
              fontSize: 18,
              textDecoration: "none",
              color: "rgba(255,255,255,0.95)",
              whiteSpace: "nowrap",
            }}
          >
            GK-App
          </Link>

          {user && levelInfo && (
            <div
              className="nav-level"
              style={{
                width: 300,
                padding: "10px 12px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                flex: "0 0 auto",
              }}
            >
              <div
                className="nav-level-text"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.85 }}>
                  {levelInfo.current.name}
                </span>
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {levelInfo.next
                    ? `${xp}/${levelInfo.next.minXp} XP`
                    : `${xp} XP`}
                </span>
              </div>

              <div
                className="nav-level-bar"
                style={{
                  height: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="nav-level-fill"
                  style={{
                    height: "100%",
                    width: `${levelInfo.progress}%`,
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, rgba(122,92,255,0.9), rgba(70,220,255,0.9))",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Orta (tek satır, taşarsa yatay scroll) */}
        {user && (
          <div
            className="nav-links"
            style={{
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 8,
              borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflowX: "auto",        
              overflowY: "hidden",
              whiteSpace: "nowrap",   
              scrollbarWidth: "none",    
            }}
          >
            {/* Chrome/Edge scroll bar gizle */}
            <style>{`
              .nav-links::-webkit-scrollbar { display: none; }
            `}</style>

            <NavLink to="/bilgiler/aktif" style={linkStyle}>
              Aktif Bilgi
            </NavLink>
            <NavLink to="/bilgiler/gunluk" style={linkStyle}>
              Günlük 6 Bilgi
            </NavLink>
            <NavLink to="/quiz" style={linkStyle}>
              Günün Quiz&apos;i
            </NavLink>
            <NavLink to="/istatistik" style={linkStyle}>
              İstatistiklerim
            </NavLink>
            <NavLink to="/leaderboard" style={linkStyle}>
              Liderlik Tablosu
            </NavLink>
          </div>
        )}

        {/* Sağ */}
        {user ? (
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "flex-end",
              whiteSpace: "nowrap",
            }}
          >
            <span
              className="nav-user"
              style={{
                padding: "9px 13px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 13,
                opacity: 0.9,
                whiteSpace: "nowrap",
              }}
              title={user.kullanici_adi}
            >
              Merhaba{" "}
              <strong style={{ opacity: 0.95 }}>{user.kullanici_adi}</strong>
            </span>

            <button
              className="btn secondary"
              onClick={handleLogout}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.90)",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Çıkış
            </button>
          </div>
        ) : (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <NavLink to="/login" style={linkStyle}>
              Giriş
            </NavLink>
            <NavLink to="/register" style={linkStyle}>
              Kayıt
            </NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}
