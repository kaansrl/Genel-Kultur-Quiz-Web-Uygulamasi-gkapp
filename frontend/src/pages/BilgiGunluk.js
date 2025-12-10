// src/pages/BilgiGunluk.js
import React, { useEffect, useState } from "react";
import { getGunlukBilgi } from "../Api";

export default function BilgiGunluk() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading");

  async function load(d) {
    setState("loading");
    try {
      const list = await getGunlukBilgi(d);
      setRows(list || []);
      setState(list && list.length ? "ready" : "empty");
    } catch (e) { console.error(e); setState("error"); }
  }
  useEffect(() => { load(date); }, []);

  return (
  <div className="container">
    <div className="card">
      <h2>Günün 6 Bilgisi</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          margin: "12px 0",
        }}
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
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
            gridTemplateColumns: "repeat(2, 1fr)", // ⬅️ 2 sütun
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
                padding: 20,
                minHeight: 260, // ⬅️ kare hissi
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                {new Date(r.gorunur_baslangic).toLocaleTimeString("tr-TR")} –{" "}
                {new Date(r.gorunur_bitis).toLocaleTimeString("tr-TR")}
              </div>

              <div>{r.icerik}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

}
