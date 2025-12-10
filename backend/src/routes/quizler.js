// src/routes/quizler.js
import express from "express";
import {
  generateQuestionsForTodayQuiz,
  getTodayQuizWithQuestions,
  getTodayQuizStatusForUser,
  saveTodayQuizAnswers,
} from "../services/quizService.js";

const router = express.Router();

function getUserIdFromReq(req) {
  return (
    req.session?.user?.id ||
    req.user?.kullanici_id ||
    req.session?.kullanici_id ||
    null
  );
}

router.get("/__ping", (req, res) => {
  res.json({ ok: true, route: "quizler" });
});

router.post("/admin/generate-today", async (req, res) => {
  try {
    const result = await generateQuestionsForTodayQuiz();
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("POST /api/quizler/admin/generate-today", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

router.get("/bugun", async (req, res) => {
  try {
    const data = await getTodayQuizWithQuestions();
    if (!data) return res.json({ ok: true, quiz: null, sorular: [] });
    res.json({ ok: true, quiz: data.quiz, sorular: data.sorular });
  } catch (e) {
    console.error("GET /api/quizler/bugun", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

router.get("/bugun/durum", async (req, res) => {
  try {
    const kullaniciId = getUserIdFromReq(req);
    if (!kullaniciId) {
      console.warn("GET /api/quizler/bugun/durum: kullaniciId yok");
      return res.status(401).json({ ok: false, error: "Oturum bulunamadı" });
    }

    const data = await getTodayQuizStatusForUser(kullaniciId);
    if (!data) return res.json({ ok: true, quiz: null, sorular: [] });

    res.json({
      ok: true,
      quiz: data.quiz,
      sorular: data.sorular,
      cevaplar: data.cevaplar,
      zatenCozmusMu: data.zatenCozmusMu,
      toplamDogru: data.toplamDogru,
    });
  } catch (e) {
    console.error("GET /api/quizler/bugun/durum", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

router.post("/bugun/cevapla", async (req, res) => {
  try {
    const kullaniciId = getUserIdFromReq(req);
    if (!kullaniciId) {
      console.warn("POST /api/quizler/bugun/cevapla: kullaniciId yok");
      return res.status(401).json({ ok: false, error: "Oturum bulunamadı" });
    }

    console.log("DEBUG /bugun/cevapla body:", req.body);

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      console.warn("POST /bugun/cevapla: answers boş veya array değil");
      return res
        .status(400)
        .json({ ok: false, error: "answers boş olamaz" });
    }

    const result = await saveTodayQuizAnswers({ kullaniciId, answers });
    console.log("DEBUG saveTodayQuizAnswers result:", result);

    return res.json(result);
  } catch (e) {
    console.error("POST /api/quizler/bugun/cevapla HATA:", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

export default router;
