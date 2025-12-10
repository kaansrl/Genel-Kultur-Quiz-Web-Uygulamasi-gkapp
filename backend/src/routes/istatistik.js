// src/routes/istatistik.js
import express from "express";
import {
  getUserStats,
  getUserStatsComment,
  getLeaderboard,
} from "../services/statsService.js";

const router = express.Router();

// Oturumdan kullanıcı ID'sini alan yardımcı
function getUserIdFromReq(req) {
  return (
    req.session?.user?.id ||
    req.user?.kullanici_id ||
    req.session?.kullanici_id ||
    null
  );
}

// 🟣 Benim istatistiklerim
router.get("/ben", async (req, res) => {
  try {
    const kullaniciId = getUserIdFromReq(req);
    if (!kullaniciId) {
      return res.status(401).json({ ok: false, error: "Oturum bulunamadı" });
    }

    const stats = await getUserStats(kullaniciId);
    if (!stats) {
      return res.json({ ok: true, stats: null });
    }

    res.json({ ok: true, stats });
  } catch (e) {
    console.error("GET /api/istatistik/ben", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

// 🟣 Yapay zekâ yorumları (genel + bugün + trend)
router.get("/ben/yorum", async (req, res) => {
  try {
    const kullaniciId = getUserIdFromReq(req);
    if (!kullaniciId) {
      return res.status(401).json({ ok: false, error: "Oturum bulunamadı" });
    }

    const yorumlar = await getUserStatsComment(kullaniciId);
    res.json({ ok: true, ...yorumlar });
  } catch (e) {
    console.error("GET /api/istatistik/ben/yorum", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

// 🟣 Liderlik tablosu (ilk 20)
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = 20; // istersen 50 yapabilirsin
    const leaderboard = await getLeaderboard(limit);
    res.json({ ok: true, leaderboard });
  } catch (e) {
    console.error("GET /api/istatistik/leaderboard", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

export default router;
