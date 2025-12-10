// src/pages/BilgiAktif.js
import React, { useEffect, useState } from "react";
import { getAktifBilgi, markBilgiOkundu } from "../Api";
import { useAuth } from "../AuthContext";

export default function BilgiAktif() {
  const { setUser } = useAuth();

  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");

  const [xpEarned, setXpEarned] = useState(null);
  const [markedRead, setMarkedRead] = useState(false);

  // 🔹 Aktif bilgiyi yükle
  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const bilgi = await getAktifBilgi();

        if (ignore) return;

        if (!bilgi) {
          setState("empty");
        } else {
          setData(bilgi);
          setState("ready");
        }
      } catch (e) {
        console.error("BilgiAktif yüklenirken hata:", e);
        if (!ignore) setState("error");
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // 🔹 Bilgi yüklendikten sonra okundu → XP + toast
  useEffect(() => {
    if (!data?.bilgi_id) return;
    if (markedRead) return;

    let ignore = false;

    (async () => {
      try {
        const res = await markBilgiOkundu(data.bilgi_id);
        if (ignore) return;

        if (res?.ok) {
          setMarkedRead(true);

          const bonus =
            typeof res.xpEarned === "number" ? res.xpEarned : 0;
          setXpEarned(bonus);

          if (bonus > 0) {
            // ✅ XP barını güncelle
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    xp: (prev.xp ?? 0) + bonus,
                  }
                : prev
            );

            // ✅ XP toast göster
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
      } catch (e) {
        console.error("Bilgi okundu XP isteği hatası:", e);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [data?.bilgi_id, markedRead, setUser]);

  // ---- UI ----
  if (state === "loading") {
    return (
      <div className="container">
        <div className="card">Yükleniyor…</div>
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
  <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
    <div
      className="card"
      style={{
        width: 600,              // ⬅️ daha geniş
        minHeight: 350,          // ⬅️ kare hissi
        padding: 32,             // ⬅️ daha ferah
        borderRadius: 16,        // ⬅️ yuvarlatılmış köşeler
        fontSize: "18px",        // ⬅️ daha büyük yazı!
        lineHeight: "1.6",       // ⬅️ daha rahat okuma
      }}
    >
      <h2 style={{ fontSize: "22px", marginBottom: 16 }}>Şu An Görünür Bilgi</h2>

      <p style={{ marginBottom: 20 }}>{data.icerik}</p>

      <div style={{ marginTop: "auto", fontSize: "16px", opacity: 0.7 }}>
        {new Date(data.gorunur_baslangic).toLocaleTimeString("tr-TR")} –{" "}
        {new Date(data.gorunur_bitis).toLocaleTimeString("tr-TR")}
      </div>

      {xpEarned !== null && xpEarned > 0 && (
        <div style={{ marginTop: 12, fontWeight: "bold", fontSize: "18px", color: "#4caf50" }}>
          +{xpEarned} XP 🎉
        </div>
      )}
    </div>
  </div>
);

}
