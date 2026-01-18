// src/pages/Leaderboard.js
import React, { useEffect, useState } from "react";
import { getLeaderboard } from "../Api";

function medalEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const lb = await getLeaderboard();
        console.log("LEADERBOARD API:", lb);

        if (lb?.ok) setLeaderboard(lb.leaderboard || []);
        else setError(lb?.error || "Liderlik tablosu yüklenemedi.");
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
        setError("Liderlik tablosu yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      {/* ✅ GÖRÜNÜR DEBUG BAŞLIK (mutlaka görünür) */}
      <div style={{ marginBottom: 14, fontSize: 18, fontWeight: 800 }}>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 26 }}>
        <h1 className="h1" style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>
          Liderlik Tablosu
        </h1>
        <div style={{ marginTop: 6, opacity: 0.85, fontSize: 18 }}>
          İlk 20 oyuncu toplam XP değerine göre sıralanır!
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 32 }}>
        {loading && <p style={{ marginTop: 12 }}>Liderlik tablosu yükleniyor...</p>}

        {!loading && error && (
          <p className="h2" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}

        {!loading && !error && leaderboard.length === 0 && (
          <p style={{ marginTop: 12 }}>Şu anda gösterilecek liderlik verisi yok.</p>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 6 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 6px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    Sıra
                  </th>
                  <th style={{ textAlign: "left", padding: "10px 6px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    Kullanıcı
                  </th>
                  <th style={{ textAlign: "right", padding: "10px 6px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    XP
                  </th>
                  <th style={{ textAlign: "right", padding: "10px 6px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    Seviye
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u) => (
                  <tr key={u.kullaniciId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "10px 6px", width: 70 }}>
                      <strong>
                        {u.sira} {medalEmoji(u.sira)}
                      </strong>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <span style={{ fontWeight: 700 }}>{u.kullaniciAdi}</span>
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      <strong>{u.xp}</strong>
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right", opacity: 0.9 }}>
                      {u.seviye}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
