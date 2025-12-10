// src/routes/bilgiler.js
import express from "express";
import pool from "../db.js";
import { generateAndStoreToday } from "../services/bilgiService.js";
import { addFactReadXp } from "../services/xpService.js"; // 🟩 bilgi okuma XP

const router = express.Router();

// Oturumdaki kullanıcı ID'sini al
function getUserIdFromReq(req) {
  return (
    req.session?.user?.id ||
    req.user?.kullanici_id ||
    req.session?.kullanici_id ||
    null
  );
}

// Yanıta dahil edeceğimiz kolonlar (embedding yok)
const PUBLIC_COLS = `
  bilgi_id, icerik, gorunur_baslangic, gorunur_bitis, olusturulma_tarihi
`;

// Basit ping (mount oldu mu testi)
router.get("/__ping", (req, res) => res.json({ ok: true }));

// 🔹 O an görünür olan bilgi (embedding dönmez)
router.get("/aktif", async (req, res) => {
  try {
    const q = `
      SELECT ${PUBLIC_COLS}
      FROM public.bilgiler
      WHERE now() >= gorunur_baslangic
        AND now() <  gorunur_bitis
      ORDER BY gorunur_baslangic DESC
      LIMIT 1;
    `;
    const { rows } = await pool.query(q);
    res.set("Cache-Control", "no-store");
    // Frontend bu endpoint'ten direkt bilgi objesi bekliyor
    res.json(rows[0] || null);
  } catch (err) {
    console.error("GET /api/bilgiler/aktif", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// 🔹 Bugünün 6 bilgisi (opsiyonel ?date=YYYY-MM-DD) — embedding dönmez
router.get("/gunluk", async (req, res) => {
  try {
    const { date } = req.query;
    const q = `
      SELECT ${PUBLIC_COLS}
      FROM public.bilgiler
      WHERE COALESCE($1::date, CURRENT_DATE) = gorunur_baslangic::date
      ORDER BY gorunur_baslangic ASC;
    `;
    const { rows } = await pool.query(q, [date || null]);
    res.set("Cache-Control", "no-store");
    // Frontend burada da direkt array bekliyor
    res.json(rows);
  } catch (err) {
    console.error("GET /api/bilgiler/gunluk", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// 🔹 Manuel üretim (dev/test): bugüne 6 bilgi üret ve kaydet
router.post("/admin/uret", async (req, res) => {
  try {
    const result = await generateAndStoreToday();
    res.json(result);
  } catch (e) {
    console.error("POST /api/bilgiler/admin/uret", e);
    res.status(500).json({ error: "Üretim hatası" });
  }
});

// 🟩 Bilgi okundu → XP bonusu
router.post("/okundu", async (req, res) => {
  try {
    const kullaniciId = getUserIdFromReq(req);
    if (!kullaniciId) {
      return res.status(401).json({ ok: false, error: "Oturum bulunamadı" });
    }

    const { bilgiId } = req.body;
    if (!bilgiId) {
      return res.status(400).json({ ok: false, error: "bilgiId gerekli" });
    }

    // addFactReadXp, daha önce bu kullanıcı + bilgi için XP verildiyse 0 dönebilir
    const xpEarned = await addFactReadXp(kullaniciId, bilgiId);

    res.json({
      ok: true,
      xpEarned,
    });
  } catch (e) {
    console.error("POST /api/bilgiler/okundu", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

export default router;
