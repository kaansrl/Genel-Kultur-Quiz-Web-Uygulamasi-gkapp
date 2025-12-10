// src/auth.routes.js
import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "./db.js";
import { addDailyLoginXp } from "./services/xpService.js"; // 🟩 günlük giriş XP

const router = Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { eposta, parola, kullanici_adi } = req.body;
    if (!eposta || !parola || !kullanici_adi) {
      return res.status(400).json({ ok: false, error: "Eksik alan" });
    }

    const exist = await pool.query(
      "SELECT 1 FROM kullanicilar WHERE eposta=$1",
      [eposta]
    );
    if (exist.rowCount > 0) {
      return res
        .status(409)
        .json({ ok: false, error: "E-posta zaten kayıtlı" });
    }

    const hash = await bcrypt.hash(parola, 12);
    const ins = await pool.query(
      `INSERT INTO kullanicilar (eposta, parola_hash, kullanici_adi)
       VALUES ($1,$2,$3)
       RETURNING kullanici_id, eposta, kullanici_adi, xp, seviye, statu`,
      [eposta, hash, kullanici_adi]
    );

    const u = ins.rows[0];

    // 🟩 Kayıt olan kullanıcıya ilk gün giriş bonusu da verelim (opsiyonel ama güzel durur)
    let loginXp = 0;
    try {
      loginXp = await addDailyLoginXp(u.kullanici_id);
      if (loginXp > 0) {
        const q2 = await pool.query(
          "SELECT xp, seviye FROM kullanicilar WHERE kullanici_id=$1",
          [u.kullanici_id]
        );
        if (q2.rowCount > 0) {
          u.xp = q2.rows[0].xp;
          u.seviye = q2.rows[0].seviye;
        }
      }
    } catch (e) {
      console.error("addDailyLoginXp (register) hata:", e);
    }

    req.session.user = {
      id: u.kullanici_id,
      eposta: u.eposta,
      kullanici_adi: u.kullanici_adi,
      xp: u.xp,
      seviye: u.seviye,
      statu: u.statu,
    };

    res.json({
      ok: true,
      user: req.session.user,
      loginXp, // istersen frontendde “hoş geldin, +5 XP!” diye gösterebilirsin
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { eposta, parola } = req.body;
    if (!eposta || !parola) {
      return res.status(400).json({ ok: false, error: "Eksik alan" });
    }

    const q = await pool.query(
      "SELECT * FROM kullanicilar WHERE eposta=$1",
      [eposta]
    );
    if (q.rowCount === 0) {
      return res.status(401).json({ ok: false, error: "Geçersiz giriş" });
    }

    const u = q.rows[0];
    const match = await bcrypt.compare(parola, u.parola_hash);
    if (!match) {
      return res.status(401).json({ ok: false, error: "Geçersiz giriş" });
    }

    // 🟩 Günlük giriş XP bonusu
    let loginXp = 0;
    try {
      loginXp = await addDailyLoginXp(u.kullanici_id);
      if (loginXp > 0) {
        // XP ve seviye DB'de güncellendi; son halini tekrar çekelim
        const q2 = await pool.query(
          "SELECT xp, seviye FROM kullanicilar WHERE kullanici_id=$1",
          [u.kullanici_id]
        );
        if (q2.rowCount > 0) {
          u.xp = q2.rows[0].xp;
          u.seviye = q2.rows[0].seviye;
        }
      }
    } catch (e) {
      console.error("addDailyLoginXp (login) hata:", e);
    }

    req.session.user = {
      id: u.kullanici_id,
      eposta: u.eposta,
      kullanici_adi: u.kullanici_adi,
      xp: u.xp,
      seviye: u.seviye,
      statu: u.statu,
    };

    res.json({
      ok: true,
      user: req.session.user,
      loginXp, // frontend isterse popup gösterir, istemezse yok sayar
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

// ME
router.get("/me", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ ok: false, user: null });
  res.json({ ok: true, user: req.session.user });
});

// LOGOUT
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

export default router;
