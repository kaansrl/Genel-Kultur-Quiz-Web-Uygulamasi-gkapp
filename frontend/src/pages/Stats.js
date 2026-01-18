// src/pages/Stats.js
import React, { useEffect, useState } from "react";
import { getMyStats, getMyStatsComment } from "../Api";
import { getLevelInfo } from "../levelUtils";
import { useAuth } from "../AuthContext";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function getAccuracyLabel(oran, toplam) {
  if (!toplam) return "—";
  if (oran >= 85) return "Çok iyi";
  if (oran >= 70) return "İyi";
  if (oran >= 55) return "Orta";
  return "Geliştirilebilir";
}

export default function Stats() {
  const { setUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadingComment, setLoadingComment] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  const [comments, setComments] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await getMyStats();

        if (!res.ok) {
          setError(res.error || "İstatistikler yüklenemedi.");
          setLoading(false);
          setLoadingComment(false);
          return;
        }

        setStats(res.stats);

        // navbar XP senkron
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

        const y = await getMyStatsComment().catch(() => null);

        if (y && y.ok) {
          setComments({
            overall: y.overallComment || "",
            today: y.todayComment || "",
            trend: y.trendComment || "",
          });
        }
      } catch (e) {
        console.error("Stats fetch error:", e);
        setError("İstatistikler yüklenirken bir hata oluştu.");
      } finally {
        setLoadingComment(false);
      }
    }

    fetchAll();
  }, [setUser]);

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
  const xp = stats.xp ?? 0;
  const { current, next, progress } = getLevelInfo(xp);

  const toplam = stats.toplamSoru || 0;
  const dogru = stats.toplamDogru || 0;
  const yanlis = stats.toplamYanlis || 0;
  const oran = toplam > 0 ? (dogru / toplam) * 100 : 0;

  const kategoriler = stats.kategoriler || [];
  const quizler = stats.quizler || [];

  const accuracyLabel = getAccuracyLabel(oran, toplam);

  return (
    <div className="container">
      {/* HERO HEADER */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          padding: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 18,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
            title={stats.kullaniciAdi || ""}
          >
            {(stats.kullaniciAdi || "U")[0]?.toUpperCase()}
          </div>

          <div>
            <h1
              className="h1"
              style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}
            >
              İstatistiklerim
            </h1>
            <div style={{ marginTop: 6, opacity: 0.9, fontSize: 16 }}>
              <strong>{stats.kullaniciAdi || ""}</strong> •{" "}
              <strong>{stats.seviye}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card" style={{ padding: 16 }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Toplam XP</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
            {xp}
          </div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            Şu an: <strong>{current?.name}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Seviye</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
            {stats.seviye}
          </div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            İlerleme:{" "}
            <strong>{clamp(progress, 0, 100).toFixed(0)}%</strong>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Doğruluk</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
            {toplam ? oran.toFixed(1) + "%" : "—"}
          </div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            Durum: <strong>{accuracyLabel}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Toplam Soru</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
            {toplam}
          </div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            <strong>{dogru}</strong> doğru • <strong>{yanlis}</strong> yanlış
          </div>
        </div>
      </div>

      {/* XP PROGRESS */}
      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 className="h2" style={{ margin: 0 }}>
            Seviye İlerlemesi
          </h2>
          <div style={{ opacity: 0.8, fontSize: 14 }}>
            {next ? (
              <>
                Sonraki: <strong>{next.name}</strong> ({next.minXp} XP)
              </>
            ) : (
              <strong>En üst seviyedesin 🎉</strong>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              height: 14,
              borderRadius: 999,
              overflow: "hidden",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                width: `${clamp(progress, 0, 100)}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(120,120,255,0.9), rgba(80,220,255,0.9))",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              opacity: 0.85,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span>
              {current.name} ({current.minXp} XP+)
            </span>
            <span>{next ? `${xp} / ${next.minXp} XP` : `${xp} XP`}</span>
          </div>
        </div>
      </div>

      {/* KATEGORI + GECMIS QUIZ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 0.75fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <h2 className="h2" style={{ marginTop: 0 }}>
            Kategorilere Göre Genel Performans
          </h2>

          {kategoriler.length === 0 ? (
            <p style={{ opacity: 0.85 }}>Henüz kategori verisi yok.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kategoriler.map((k) => {
                const t = (k.dogru || 0) + (k.yanlis || 0);
                const p = t > 0 ? (k.dogru / t) * 100 : 0;

                return (
                  <div
                    key={k.kategori}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{k.kategori}</div>
                      <div
                        style={{
                          opacity: 0.85,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <strong>{k.dogru}</strong> D • <strong>{k.yanlis}</strong>{" "}
                        Y
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        height: 10,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.10)",
                      }}
                    >
                      <div
                        style={{
                          width: `${clamp(p, 0, 100)}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg, rgba(90,255,180,0.9), rgba(90,180,255,0.9))",
                        }}
                      />
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                      Doğruluk: <strong>{t ? p.toFixed(1) + "%" : "—"}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h2 className="h2" style={{ marginTop: 0 }}>
            Geçmiş Quizler
          </h2>

          {quizler.length === 0 ? (
            <p style={{ opacity: 0.85 }}>Henüz geçmiş quiz yok.</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 520,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {quizler.map((q, idx) => {
                const dateStr = q.tarih
                  ? new Date(q.tarih).toLocaleDateString("tr-TR")
                  : "-";
                const ratio =
                  q.soru_sayisi > 0
                    ? Math.round((q.dogru_sayisi / q.soru_sayisi) * 100)
                    : null;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <strong>{dateStr}</strong>
                      <span style={{ opacity: 0.85, fontSize: 13 }}>
                        {q.dogru_sayisi}/{q.soru_sayisi} doğru
                      </span>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                      Doğruluk:{" "}
                      <strong>{ratio !== null ? `${ratio}%` : "—"}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI COMMENT */}
      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>
          Yapay Zekâ Yorumu
        </h2>

        {loadingComment && <p>Yorum hazırlanıyor...</p>}

        {!loadingComment && !comments && <p>Şu anda gösterilecek yorum yok.</p>}

        {!loadingComment && comments && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.overall && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <strong>Genel durum:</strong> {comments.overall}
              </div>
            )}
            {comments.today && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <strong>Bugün için:</strong> {comments.today}
              </div>
            )}
            {comments.trend && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <strong>Son günlerin trendi:</strong> {comments.trend}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 980px) {
          .container > div[style*="grid-template-columns: 1.25fr"] {
            grid-template-columns: 1fr !important;
          }
          .container > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 560px) {
          .container > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
