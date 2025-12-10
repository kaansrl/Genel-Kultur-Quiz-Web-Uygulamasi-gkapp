// src/pages/Stats.js
import React, { useEffect, useState } from "react";
import { getMyStats, getMyStatsComment, getLeaderboard } from "../Api";


import { getLevelInfo, LEVELS } from "../levelUtils";
// src/pages/Stats.js

import { useAuth } from "../AuthContext";   // ⬅️ yeni







export default function Stats() {
  const { setUser } = useAuth();  
  const [loading, setLoading] = useState(true);
  const [loadingComment, setLoadingComment] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  // yorumlar artık obje
  const [comments, setComments] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await getMyStats();
        console.log("getMyStats response:", res);

        if (!res.ok) {
          setError(res.error || "İstatistikler yüklenemedi.");
          setLoading(false);
          setLoadingComment(false);
          setLoadingLeaderboard(false);
          return;
        }

        setStats(res.stats);
        setUser((prev) =>
  prev
    ? {
        ...prev,
        xp: res.stats.xp,
        seviye: res.stats.seviye,
      }
    : prev
);
        setLoading(false);

        const [y, lb] = await Promise.all([
          getMyStatsComment().catch(() => null),
          getLeaderboard().catch(() => null),
        ]);

        if (y && y.ok) {
          setComments({
            overall: y.overallComment || "",
            today: y.todayComment || "",
            trend: y.trendComment || "",
          });
        }

        if (lb && lb.ok) setLeaderboard(lb.leaderboard || []);
      } catch (e) {
        console.error("Stats fetch error:", e);
        setError("İstatistikler yüklenirken bir hata oluştu.");
      } finally {
        setLoadingComment(false);
        setLoadingLeaderboard(false);
      }
    }

    fetchAll();
  }, []);

  // ---- loading / error / boş durumlar ----
  if (loading) {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h2">İstatistikler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h2">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h2">İstatistik bulunamadı.</p>
        </div>
      </div>
    );
  }

  // ---- hesaplamalar ----
  const { current, next, progress } = getLevelInfo(stats.xp);
  const toplam = stats.toplamSoru || 0;
  const dogru = stats.toplamDogru || 0;
  const yanlis = stats.toplamYanlis || 0;
  const oran = toplam > 0 ? (dogru / toplam) * 100 : 0;

  const kategoriler = stats.kategoriler || [];
  const quizler = stats.quizler || [];

  return (
    <div className="container">
      {/* başlık */}
<div
  className="card"
  style={{
    marginBottom: 16,
    textAlign: "center",
    padding: "32px 0",
  }}
>
  <h1 className="h1" style={{ fontSize: 38, marginBottom: 4 }}>
    İstatistiklerim
  </h1>

  <p
    style={{
      fontSize: 26,
      fontWeight: 600,
      margin: 0,
    }}
  >
    {stats.kullaniciAdi || ""}
  </p>
</div>


      {/* seviye & xp */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2">Seviye ve XP</h2>
        <p>
          Seviye: <strong>{stats.seviye}</strong>
        </p>
        <p>
          Toplam XP: <strong>{stats.xp}</strong>
        </p>

        <div style={{ marginTop: 12 }}>
          <div
            style={{
              background: "#eee",
              borderRadius: 999,
              overflow: "hidden",
              height: 16,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#4caf50",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              {current.name} ({current.minXp} XP+)
            </span>
            <span>
              {next
                ? `Sonraki seviye: ${next.name} (${next.minXp} XP)`
                : "En üst seviyedesin 🎉"}
            </span>
          </div>
        </div>
      </div>

      {/* genel quiz performansı */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2">Quiz Performansı</h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 12,
          }}
        >
          <div className="hero-hint">
            Toplam soru: <strong>{toplam}</strong>
          </div>
          <div className="hero-hint">
            Doğru: <strong>{dogru}</strong>
          </div>
          <div className="hero-hint">
            Yanlış: <strong>{yanlis}</strong>
          </div>
          <div className="hero-hint">
            Doğruluk oranı:{" "}
            <strong>{toplam > 0 ? oran.toFixed(1) + " %" : "-"}</strong>
          </div>
        </div>
      </div>

      {/* kategorilere göre performans */}
      {kategoriler.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2">Kategorilere Göre Performans</h2>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Kategori
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Doğru
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Yanlış
                  </th>
                </tr>
              </thead>
              <tbody>
                {kategoriler.map((k) => (
                  <tr key={k.kategori}>
                    <td style={{ padding: "6px 4px" }}>{k.kategori}</td>
                    <td style={{ padding: "6px 4px", textAlign: "right" }}>
                      {k.dogru}
                    </td>
                    <td style={{ padding: "6px 4px", textAlign: "right" }}>
                      {k.yanlis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* geçmiş quizler */}
      {quizler.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2">Geçmiş Quizler</h2>
          <ul style={{ marginTop: 8, listStyle: "none", paddingLeft: 0 }}>
            {quizler.map((q, idx) => {
              const dateStr = q.tarih
                ? new Date(q.tarih).toLocaleDateString("tr-TR")
                : "-";
              return (
                <li
                  key={idx}
                  style={{
                    padding: "6px 0",
                    borderBottom:
                      idx === quizler.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,0.08)",
                    fontSize: 14,
                  }}
                >
                  <strong>{dateStr}</strong> –{" "}
                  {q.dogru_sayisi}/{q.soru_sayisi} doğru
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* yapay zeka yorumları */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2">Yapay Zekâ Yorumu</h2>
        {loadingComment && <p>Yorum hazırlanıyor...</p>}

        {!loadingComment && !comments && (
          <p>Şu anda gösterilecek yorum yok.</p>
        )}

        {!loadingComment && comments && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {comments.overall && (
              <p>
                <strong>Genel durum:</strong> {comments.overall}
              </p>
            )}
            {comments.today && (
              <p>
                <strong>Bugün için:</strong> {comments.today}
              </p>
            )}
            {comments.trend && (
              <p>
                <strong>Son günlerin trendi:</strong> {comments.trend}
              </p>
            )}
          </div>
        )}
      </div>

      {/* liderlik tablosu */}
      <div className="card" style={{ marginTop: 16, marginBottom: 32 }}>
        <h2 className="h2">Liderlik Tablosu</h2>
        {loadingLeaderboard && <p>Liderlik tablosu yükleniyor...</p>}

        {!loadingLeaderboard && leaderboard.length === 0 && (
          <p>Şu anda gösterilecek liderlik verisi yok.</p>
        )}

        {!loadingLeaderboard && leaderboard.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Sıra
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Kullanıcı
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    XP
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 4px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Seviye
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u) => (
                  <tr key={u.kullaniciId}>
                    <td style={{ padding: "6px 4px" }}>{u.sira}</td>
                    <td style={{ padding: "6px 4px" }}>{u.kullaniciAdi}</td>
                    <td style={{ padding: "6px 4px", textAlign: "right" }}>
                      {u.xp}
                    </td>
                    <td style={{ padding: "6px 4px", textAlign: "right" }}>
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
