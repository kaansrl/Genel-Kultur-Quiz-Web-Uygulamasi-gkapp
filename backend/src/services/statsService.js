// src/services/statsService.js
import pool from "../db.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -------------------------------------------------
   SABİT KATEGORİLER (ÖNEMLİ!)
   Backend artık sadece bu 6 kategoriye izin verir.
--------------------------------------------------- */
const FIXED_CATEGORIES = [
  "Tarih",
  "Bilim veya İcatlar",
  "Sanat",
  "Coğrafya",
  "Edebiyat veya Dil",
  "Spor veya Sağlık",
];

/**
 * Belirli bir kullanıcı için istatistikleri getirir.
 */
export async function getUserStats(kullaniciId) {
  if (!kullaniciId) return null;

  // 1) Kullanıcı temel bilgileri
  const baseQ = `
    SELECT kullanici_adi,
           COALESCE(xp, 0)           AS xp,
           COALESCE(seviye, 'Acemi') AS seviye
    FROM public.kullanicilar
    WHERE kullanici_id = $1;
  `;
  const { rows: baseRows } = await pool.query(baseQ, [kullaniciId]);
  if (baseRows.length === 0) return null;
  const base = baseRows[0];

  // 2) Kullanıcının kategori bazlı doğru/yanlışları
  const kategoriQ = `
    SELECT
      COALESCE(b.kategori, 'Diğer') AS kategori,
      COUNT(*) FILTER (WHERE kc.dogru_mu)     ::int AS dogru,
      COUNT(*) FILTER (WHERE NOT kc.dogru_mu) ::int AS yanlis
    FROM public.kullanici_cevaplari kc
    JOIN public.sorular  s ON s.soru_id  = kc.soru_id
    JOIN public.bilgiler b ON b.bilgi_id = s.bilgi_id
    WHERE kc.kullanici_id = $1
    GROUP BY COALESCE(b.kategori, 'Diğer')
    ORDER BY kategori;
  `;
  const { rows: kategoriRowsRaw } = await pool.query(kategoriQ, [kullaniciId]);

  // 3) SABİT KATEGORİ TABLOSU OLUŞTUR — Eksik olanları 0–0 ile ekle
  const kategoriMap = {};
  for (const cat of FIXED_CATEGORIES) {
    kategoriMap[cat] = { kategori: cat, dogru: 0, yanlis: 0 };
  }

  for (const r of kategoriRowsRaw) {
    if ( FIXED_CATEGORIES.includes(r.kategori) ) {
      kategoriMap[r.kategori] = r; // doğru kategori ise override
    }
  }

  const kategoriRows = Object.values(kategoriMap);

  // 4) Genel quiz performansı
  const overallQ = `
    SELECT
      COUNT(*)::int AS toplam_soru,
      COUNT(*) FILTER (WHERE kc.dogru_mu)       ::int AS toplam_dogru,
      COUNT(*) FILTER (WHERE NOT kc.dogru_mu)   ::int AS toplam_yanlis
    FROM public.kullanici_cevaplari kc
    JOIN public.sorular s ON s.soru_id = kc.soru_id
    JOIN public.quizler  q ON q.quiz_id = s.quiz_id
    WHERE kc.kullanici_id = $1;
  `;
  const { rows: overallRows } = await pool.query(overallQ, [kullaniciId]);
  const overall = overallRows[0] || {
    toplam_soru: 0,
    toplam_dogru: 0,
    toplam_yanlis: 0,
  };

  // 5) Son 30 gün quizleri
  const quizlerQ = `
    SELECT
      q.tarih,
      COUNT(*)                                  ::int AS soru_sayisi,
      COUNT(*) FILTER (WHERE kc.dogru_mu)       ::int AS dogru_sayisi
    FROM public.quizler q
    JOIN public.sorular s ON s.quiz_id = q.quiz_id
    JOIN public.kullanici_cevaplari kc
      ON kc.soru_id = s.soru_id
     AND kc.kullanici_id = $1
    GROUP BY q.tarih
    ORDER BY q.tarih DESC
    LIMIT 30;
  `;
  const { rows: quizlerRows } = await pool.query(quizlerQ, [kullaniciId]);

  return {
    kullaniciId,
    kullaniciAdi: base.kullanici_adi,
    xp: base.xp,
    seviye: base.seviye,
    toplamSoru: overall.toplam_soru,
    toplamDogru: overall.toplam_dogru,
    toplamYanlis: overall.toplam_yanlis,
    kategoriler: kategoriRows,
    quizler: quizlerRows,
  };
}

/* -------------------------------------------------------
   YORUM ÜRETİCİ
-------------------------------------------------------- */
export async function getUserStatsComment(kullaniciId) {
  const stats = await getUserStats(kullaniciId);
  if (!stats) {
    return {
      ok: true,
      overallComment:
        "Henüz yeterli istatistiğin yok. Birkaç gün üst üste quiz çözdükten sonra daha anlamlı yorumlar yapabilirim.",
      todayComment: null,
      trendComment: null,
    };
  }

  const todayQ = `
    SELECT
      q.tarih,
      COUNT(*)                                  ::int AS soru_sayisi,
      COUNT(*) FILTER (WHERE kc.dogru_mu)       ::int AS dogru_sayisi
    FROM public.quizler q
    JOIN public.sorular s ON s.quiz_id = q.quiz_id
    JOIN public.kullanici_cevaplari kc
      ON kc.soru_id = s.soru_id
     AND kc.kullanici_id = $1
    WHERE q.tarih = CURRENT_DATE
    GROUP BY q.tarih
    LIMIT 1;
  `;
  const { rows: todayRows } = await pool.query(todayQ, [kullaniciId]);
  const today = todayRows[0] || null;

  const payload = {
    user: { ad: stats.kullaniciAdi, seviye: stats.seviye, xp: stats.xp },
    genel: {
      toplamSoru: stats.toplamSoru,
      toplamDogru: stats.toplamDogru,
      toplamYanlis: stats.toplamYanlis,
    },
    bugun: today
      ? {
          soruSayisi: today.soru_sayisi,
          dogruSayisi: today.dogru_sayisi,
        }
      : null,
    kategoriler: stats.kategoriler,
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Kullanıcının quiz istatistiklerine göre detaylı ve motive edici yorumlar üret. Türkçe konuş.",
      },
      {
        role: "user",
        content:
          "Bu JSON istatistiklerine göre iki yorum üret: {overallComment, todayComment}.\n" +
          JSON.stringify(payload),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {}

  return {
    ok: true,
    overallComment: parsed.overallComment || "",
    todayComment: parsed.todayComment || "",
    trendComment: null,
  };
}

/* ----------------------------------------------
   LİDERLİK TABLOSU
---------------------------------------------- */
// src/services/statsService.js  (EN ALTA EKLE / DÜZENLE)
export async function getLeaderboard(limit = 20) {
  const q = `
    SELECT
      k.kullanici_id    AS "kullaniciId",
      k.kullanici_adi   AS "kullaniciAdi",
      COALESCE(k.xp, 0) AS xp,
      COALESCE(k.seviye, 'Acemi') AS seviye
    FROM public.kullanicilar k
    -- XP'si 0 olanları da göstermek istersen WHERE'i kaldırabilirsin
    -- WHERE COALESCE(k.xp, 0) > 0
    ORDER BY xp DESC, kullanici_id ASC
    LIMIT $1;
  `;

  const { rows } = await pool.query(q, [limit]);

  // DİKKAT: SADECE ARRAY dönüyoruz
  return rows.map((row, idx) => ({
    sira: idx + 1,
    kullaniciId: row.kullaniciId,
    kullaniciAdi: row.kullaniciAdi,
    xp: row.xp,
    seviye: row.seviye,
  }));
}

