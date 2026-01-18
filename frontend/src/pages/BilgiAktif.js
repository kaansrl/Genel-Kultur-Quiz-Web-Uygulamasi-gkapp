import React, { useEffect, useMemo, useState } from "react";
import { getAktifBilgi, markBilgiOkundu, extractApiError } from "../Api";
import { useAuth } from "../AuthContext";

// 🕒 Lokal saat penceresi (Europe/Istanbul cihaz saatine göre)
function minutesOfDay(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}
function isWithinQuizWindow(d = new Date()) {
  const m = minutesOfDay(d);
  return m >= 20 * 60 && m < 20 * 60 + 15; // 20:00–20:15
}
function isAfterDailyFactsEnd(d = new Date()) {
  const m = minutesOfDay(d);
  return m >= 20 * 60; // 20:00+
}
function isBeforeFactsStart(d = new Date()) {
  const m = minutesOfDay(d);
  return m < 8 * 60; // 08:00 öncesi
}

export default function BilgiAktif() {
  const { setUser } = useAuth();

  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | empty | error | locked | night | morning
  const [lockMessage, setLockMessage] = useState("");

  const [xpEarned, setXpEarned] = useState(null);
  const [markedRead, setMarkedRead] = useState(false);

  const now = useMemo(() => new Date(), []); // sayfa ilk açıldığı an
  const withinQuiz = isWithinQuizWindow(now);
  const after20 = isAfterDailyFactsEnd(now);
  const before8 = isBeforeFactsStart(now);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const bilgi = await getAktifBilgi();
        if (ignore) return;

        if (!bilgi) {
          // ✅ 20:00 sonrası boş kalmasın
          if (withinQuiz) {
            setState("locked");
            setLockMessage("Quiz başladı. Haydi git ve kendini sına!");
          } else if (after20) {
            setState("night");
          } else if (before8) {
            setState("morning");
          } else {
            setState("empty");
          }
        } else {
          setData(bilgi);
          setState("ready");
        }
      } catch (err) {
        const e = extractApiError(err);
        if (ignore) return;

        if (e.status === 403) {
          setState("locked");
          setLockMessage(
            e.message || "Quiz sırasında görünür bilgi  kapalıdır.Şimdi soruları çözme vakti!"
          );
        } else {
          console.error("BilgiAktif hata:", e);
          setState("error");
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [withinQuiz, after20, before8]);

  // Bilgi yüklendikten sonra okundu → XP
  useEffect(() => {
    if (state !== "ready") return;
    if (!data?.bilgi_id) return;
    if (markedRead) return;

    let ignore = false;

    (async () => {
      try {
        const res = await markBilgiOkundu(data.bilgi_id);
        if (ignore) return;

        if (res?.ok) {
          setMarkedRead(true);

          const bonus = typeof res.xpEarned === "number" ? res.xpEarned : 0;
          setXpEarned(bonus);

          if (bonus > 0) {
            setUser((prev) =>
              prev ? { ...prev, xp: (prev.xp ?? 0) + bonus } : prev
            );

            window.dispatchEvent(
              new CustomEvent("xp-toast", {
                detail: {
                  amount: bonus,
                  message: `Bilgiyi okuduğun için +${bonus} XP kazandın!`,
                },
              })
            );
          }
        }
      } catch (err) {
        // sessiz geçebilir (quiz penceresi vs.)
        console.error("Bilgi okundu hatası:", extractApiError(err));
      }
    })();

    return () => {
      ignore = true;
    };
  }, [state, data?.bilgi_id, markedRead, setUser, data]);

  // ---- UI ----
  if (state === "loading") {
    return (
      <div className="container">
        <div className="card">Yükleniyor…</div>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h1">🔒 Quiz Zamanı!</p>
          <p className="h2" style={{ marginTop: 8 }}>
            {lockMessage}
          </p>
          <div className="hero-hint" style={{ marginTop: 10 }}>
            
          </div>
        </div>
      </div>
    );
  }

  if (state === "night") {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h1">🌙 Bugünlük Benden Bu Kadar ☺</p>
          <p className="h2" style={{ marginTop: 8 }}>
           Yarın yeni bilgilerle tekrar burada olacağım. Kendine iyi bak!
          </p>
          <div className="hero-hint" style={{ marginTop: 10 }}>
            Günün tüm bilgileri şuan “Günlük 6 Bilgi” sayfasında.
          </div>
        </div>
      </div>
    );
  }

  if (state === "morning") {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h1">☀️ Yeni Bilgiler Hazırlanıyor</p>
          <p className="h2" style={{ marginTop: 8 }}>
            Görünür bilgi gün içinde aktif olur. Lütfen <strong>08:00</strong>’den sonra tekrar kontrol et.
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="container">
        <div className="card">Bir hata oluştu.</div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="container">
        <div className="card">Şu an görünür bilgi yok.</div>
      </div>
    );
  }

  return (
  <div
    className="container"
    style={{
      display: "flex",
      justifyContent: "center",
      paddingTop: 28,
      paddingBottom: 28,
    }}
  >
    <div
      className="card"
      style={{
        width: 680,                 // biraz daha hero
        maxWidth: "92vw",
        padding: 34,
        borderRadius: 22,
        fontSize: "18px",
        lineHeight: "1.7",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* hafif parlama efekti */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 260,
          height: 260,
          background: "rgba(120, 90, 255, 0.18)",
          filter: "blur(40px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
       <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  }}
>
  <h2
    style={{
      fontSize: "24px",
      letterSpacing: 0.2,
      margin: 0,
    }}
  >
    Şu An Görünür Bilgi
  </h2>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: "18px",
      opacity: 0.85,
      whiteSpace: "nowrap",
    }}
  >
    <span>
      {new Date(data.gorunur_baslangic).toLocaleTimeString("tr-TR")} –{" "}
      {new Date(data.gorunur_bitis).toLocaleTimeString("tr-TR")}
    </span>

    {xpEarned > 0 && (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          background: "rgba(76, 175, 80, 0.15)",
          color: "#7CFC90",
          fontWeight: 700,
          fontSize: "15px",
        }}
      >
        +{xpEarned} XP kaptın!
      </span>
    )}
  </div>
</div>



        {/* başlık altı çizgi */}
        <div
          style={{
            width: 120,
            height: 4,
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            marginBottom: 18,
          }}
        />

        {/* Görsel */}
        {data.image_url && (
          <div
            style={{
              width: "100%",
              maxWidth: 360,         // ⬅️ biraz büyüt (320 -> 360)
              aspectRatio: "1 / 1",
              margin: "0 auto 18px",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 14px 38px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <img
              src={data.image_url}
              alt="Bilgi görseli"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          </div>
        )}

        {/* Metin */}
        <p style={{ marginBottom: 18, fontSize: 19, opacity: 0.96 }}>
          {data.icerik}
        </p>

        {/* zaman */}
        
      </div>
    </div>
  </div>
);

}
