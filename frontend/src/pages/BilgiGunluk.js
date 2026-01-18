import React, { useEffect, useState } from "react";
import { getGunlukBilgi, extractApiError } from "../Api";

export default function BilgiGunluk() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | empty | error | locked
  const [lockMessage, setLockMessage] = useState("");

  async function load(d) {
    setState("loading");
    try {
      const list = await getGunlukBilgi(d);
      setRows(list || []);
      setState(list && list.length ? "ready" : "empty");
    } catch (err) {
      const e = extractApiError(err);

      if (e.status === 403) {
        setState("locked");
        setLockMessage(
          e.message ||
            "Quizden sonra bugünkü tüm bilgileri bu sayfada bulabileceksin!"
        );
        setRows([]);
        return;
      }

      console.error("BilgiGunluk hata:", e);
      setState("error");
    }
  }

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (state === "locked") {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h1">🔒 Günün Bilgileri Şu An Kapalı</p>
          <p className="h2" style={{ marginTop: 8 }}>
            {lockMessage}
          </p>
          <div className="hero-hint" style={{ marginTop: 10 }}>
            Açılış: <strong>20:15</strong> 
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Günün 6 Bilgisi</h2>

        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn" onClick={() => load(date)}>
            Göster
          </button>
        </div>

        {state === "loading" && <div>Yükleniyor…</div>}
        {state === "error" && <div>Bir hata oluştu.</div>}
        {state === "empty" && <div>Bu gün için kayıt yok.</div>}

        {state === "ready" && (
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
              listStyle: "none",
              padding: 0,
              marginTop: 16,
            }}
          >
            {rows.map((r) => (
              <li
                key={r.bilgi_id}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 420,
                }}
              >
                {r.image_url && (
  <div
    style={{
      width: "100%",
      maxWidth: 260,          
      aspectRatio: "1 / 1",  
      margin: "16px auto 12px",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255,255,255,0.10)",
    }}
  >
    <img
      src={r.image_url}
      alt="Bilgi görseli"
      loading="lazy"
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


                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 700, opacity: 0.9 }}>
                    {new Date(r.gorunur_baslangic).toLocaleTimeString("tr-TR")} –{" "}
                    {new Date(r.gorunur_bitis).toLocaleTimeString("tr-TR")}
                  </div>

                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{r.icerik}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <style>{`
          @media (max-width: 700px) {
            .container ul { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
