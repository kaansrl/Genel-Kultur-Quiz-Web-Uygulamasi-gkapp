// backend/src/services/quizService.js
import pool from "../db.js";
import { generateQuestionForFact } from "./ai.js";
import { addXp } from "./xpService.js";

/* ---------------------------------------------
 *  YARDIMCI FONKSİYONLAR
 * -------------------------------------------*/

// Bugünkü 6 bilgiyi getir
async function getTodayFacts() {
  const q = `
    SELECT bilgi_id, icerik
    FROM public.bilgiler
    WHERE gorunur_baslangic::date = CURRENT_DATE
    ORDER BY gorunur_baslangic ASC;
  `;
  const { rows } = await pool.query(q);
  return rows;
}

// Bugünün quiz satırı
async function getTodayQuizRow() {
  const q = `
    SELECT *
    FROM public.quizler
    WHERE tarih = CURRENT_DATE
    LIMIT 1;
  `;
  const { rows } = await pool.query(q);
  return rows[0] || null;
}

// Bugünün quiz kaydını oluştur
async function createTodayQuiz() {
  const q = `
    INSERT INTO public.quizler (tarih, baslangic_saat, bitis_saat)
    VALUES (CURRENT_DATE, '20:00', '20:15')
    RETURNING *;
  `;
  const { rows } = await pool.query(q);
  return rows[0];
}

// Soru kaydet
async function insertQuestion({ quiz_id, bilgi_id, icerik }) {
  const q = `
    INSERT INTO public.sorular (quiz_id, bilgi_id, icerik, olusturulma_tarihi)
    VALUES ($1, $2, $3, NOW())
    RETURNING soru_id;
  `;
  const { rows } = await pool.query(q, [quiz_id, bilgi_id, icerik]);
  return rows[0]?.soru_id;
}

/* ---------------------------------------------
 * 1) BUGÜNÜN QUİZİNİ ÜRET  (cron bunu çağırıyor)
 * -------------------------------------------*/

export async function generateQuestionsForTodayQuiz() {
  const facts = await getTodayFacts();
  if (facts.length === 0) {
    return { created: false, reason: "today_no_facts" };
  }

  let quiz = await getTodayQuizRow();
  if (!quiz) quiz = await createTodayQuiz();

  // Bu quiz için sorular zaten var mı?
  const checkQ = `
    SELECT COUNT(*)::int AS c
    FROM public.sorular
    WHERE quiz_id = $1;
  `;
  const checkRes = await pool.query(checkQ, [quiz.quiz_id]);
  if (checkRes.rows[0].c > 0) {
    return {
      created: false,
      reason: "questions_already_exist",
      quiz_id: quiz.quiz_id,
    };
  }

  const insertedIds = [];

  for (const f of facts) {
    const qobj = await generateQuestionForFact(f.icerik);

    const originalOptions = qobj.secenekler || [];
    const originalCorrectIndex =
      typeof qobj.dogruIndex === "number" ? qobj.dogruIndex : 0;

    const correctAnswer = originalOptions[originalCorrectIndex];
    const wrongOptions = originalOptions.filter(
      (_, idx) => idx !== originalCorrectIndex
    );

    const { shuffledOptions, correctIndex } = shuffleOptions(
      correctAnswer,
      wrongOptions
    );

    const payload = {
      soru: qobj.soru,
      secenekler: shuffledOptions,
      dogruIndex: correctIndex,
    };

    const soruId = await insertQuestion({
      quiz_id: quiz.quiz_id,
      bilgi_id: f.bilgi_id,
      icerik: JSON.stringify(payload),
    });

    insertedIds.push(soruId);
  }

  return {
    created: true,
    quiz_id: quiz.quiz_id,
    questionCount: insertedIds.length,
    soru_ids: insertedIds,
  };
}

/* ---------------------------------------------
 * SHUFFLE
 * -------------------------------------------*/

function shuffleOptions(correct, wrongOptions) {
  const options = [correct, ...wrongOptions];
  const indices = options.map((_, idx) => idx);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledOptions = indices.map((i) => options[i]);
  const correctIndex = indices.indexOf(0);

  return { shuffledOptions, correctIndex };
}

/* ---------------------------------------------
 * 2) QUIZ + SORULAR
 * -------------------------------------------*/

export async function getTodayQuizWithQuestions() {
  const quiz = await getTodayQuizRow();
  if (!quiz) return null;

  const q = `
    SELECT soru_id, bilgi_id, icerik
    FROM public.sorular
    WHERE quiz_id = $1
    ORDER BY soru_id ASC;
  `;
  const { rows } = await pool.query(q, [quiz.quiz_id]);

  return {
    quiz,
    sorular: rows,
  };
}

/* ---------------------------------------------
 * 3) KULLANICININ BUGÜNKÜ QUIZ DURUMU
 * -------------------------------------------*/

export async function getTodayQuizStatusForUser(kullaniciId) {
  const quiz = await getTodayQuizRow();
  if (!quiz) return null;

  const qSorular = `
    SELECT soru_id, bilgi_id, icerik
    FROM public.sorular
    WHERE quiz_id = $1
    ORDER BY soru_id ASC;
  `;
  const { rows: soruRows } = await pool.query(qSorular, [quiz.quiz_id]);

  const qCevaplar = `
    SELECT kc.soru_id, kc.cevap_id, kc.dogru_mu
    FROM public.kullanici_cevaplari kc
    JOIN public.sorular s ON s.soru_id = kc.soru_id
    WHERE kc.kullanici_id = $1
      AND s.quiz_id = $2;
  `;
  const { rows: cevapRows } = await pool.query(qCevaplar, [
    kullaniciId,
    quiz.quiz_id,
  ]);

  const cevapMap = {};
  let toplamDogru = 0;

  for (const c of cevapRows) {
    cevapMap[c.soru_id] = c.cevap_id;
    if (c.dogru_mu) toplamDogru++;
  }

  return {
    quiz,
    sorular: soruRows,
    cevaplar: cevapMap,
    zatenCozmusMu: cevapRows.length > 0,
    toplamDogru,
  };
}

/* ---------------------------------------------
 * 4) BUGÜNÜN QUIZİNİ KAYDET + XP
 *  - Katılım XP'si YOK
 *  - Sadece doğru cevap sayısına göre XP
 * -------------------------------------------*/

export async function saveTodayQuizAnswers({ kullaniciId, answers }) {
  try {
    console.log("DEBUG saveTodayQuizAnswers input:", { kullaniciId, answers });

    const quiz = await getTodayQuizRow();

    if (!quiz) {
      return {
        ok: false,
        alreadyAnswered: false,
        toplamDogru: 0,
        error: "Bugün için quiz bulunamadı.",
      };
    }

    if (!kullaniciId) {
      console.error("saveTodayQuizAnswers: kullaniciId yok!");
      return {
        ok: false,
        alreadyAnswered: false,
        toplamDogru: 0,
        error: "Kullanıcı oturumu bulunamadı.",
      };
    }

    // Bu kullanıcı bugün zaten quiz çözmüş mü?
    const qCheck = `
      SELECT COUNT(*)::int AS c
      FROM public.kullanici_cevaplari kc
      JOIN public.sorular s ON s.soru_id = kc.soru_id
      WHERE kc.kullanici_id = $1
        AND s.quiz_id = $2;
    `;
    const { rows: checkRows } = await pool.query(qCheck, [
      kullaniciId,
      quiz.quiz_id,
    ]);

    console.log("DEBUG qCheck count:", checkRows[0].c);

    if (checkRows[0].c > 0) {
      return { ok: true, alreadyAnswered: true, toplamDogru: 0 };
    }

    // Bugünün soruları
    const soruQ = `
      SELECT soru_id, icerik
      FROM public.sorular
      WHERE quiz_id = $1;
    `;
    const { rows: soruRows } = await pool.query(soruQ, [quiz.quiz_id]);

    const soruMap = new Map();
    for (const r of soruRows) {
      try {
        const payload = JSON.parse(r.icerik);
        const dogruIndex =
          typeof payload?.dogruIndex === "number" ? payload.dogruIndex : 0;
        soruMap.set(r.soru_id, dogruIndex);
      } catch (e) {
        console.error("Soru icerik JSON parse error:", r.soru_id, e);
        soruMap.set(r.soru_id, 0);
      }
    }

    let toplamDogru = 0;

    const insertKC = `
      INSERT INTO public.kullanici_cevaplari
        (kullanici_id, soru_id, cevap_id, dogru_mu, cevaplama_tarihi)
      VALUES ($1, $2, $3, $4, NOW());
    `;

    for (const a of answers) {
      const soruId = a.soru_id;
      const secilenIndex = a.secilenIndex;

      console.log("DEBUG inserting answer:", { soruId, secilenIndex });

      if (!soruMap.has(soruId)) {
        console.warn("soruMap'te olmayan soruId:", soruId);
        continue;
      }

      const dogruMu = secilenIndex === soruMap.get(soruId);
      if (dogruMu) toplamDogru++;

      try {
        await pool.query(insertKC, [
          kullaniciId,
          soruId,
          secilenIndex,
          dogruMu,
        ]);
      } catch (e) {
        console.error(
          "kullanici_cevaplari insert hatası (soru_id:",
          soruId,
          "):",
          e
        );
      }
    }

    // XP kuralı: sadece doğru sayısı → XP
    const XP_PER_CORRECT = 5;
    const kazanilanXp = toplamDogru * XP_PER_CORRECT;

    if (kazanilanXp > 0) {
      try {
        await addXp(kullaniciId, kazanilanXp);
      } catch (e) {
        console.error("XP eklerken hata:", e);
      }
    }

    return {
      ok: true,
      alreadyAnswered: false,
      toplamDogru,
    };
  } catch (err) {
    console.error("saveTodayQuizAnswers genel hata:", err);
    return {
      ok: false,
      alreadyAnswered: false,
      toplamDogru: 0,
      error: "Cevaplar kaydedilirken beklenmeyen bir hata oluştu.",
    };
  }
}