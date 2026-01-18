// backend/src/services/bilgiService.js
import pool from "../db.js";
import { generateFactForCategory, embed, generateImageForBilgi } from "./ai.js";

// Eşik ayarlamaları
const SIM_THRESHOLD = Number(process.env.SIM_THRESHOLD || "0.35");
const MAX_RETRY = Number(process.env.GEN_MAX_RETRY || "5");
const SIM_LOOKBACK_DAYS = Number(process.env.SIM_LOOKBACK_DAYS || "30");

// Görsel üretim retry (istersen .env'e koy)
const IMG_MAX_RETRY = Number(process.env.IMG_MAX_RETRY || "2");

// Günlük slotlar (08:00 - 20:00)
export function getTodaySlots(base = new Date()) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  const mk = (h) => new Date(y, m, d, h, 0, 0, 0);

  return [
    { start: mk(8), end: mk(10) },
    { start: mk(10), end: mk(12) },
    { start: mk(12), end: mk(14) },
    { start: mk(14), end: mk(16) },
    { start: mk(16), end: mk(18) },
    { start: mk(18), end: mk(20) },
  ];
}

// Son X gün içindeki konuları prompt için toparlar
async function recentTopicsForPrompt(days = SIM_LOOKBACK_DAYS) {
  const q = `
    SELECT icerik
    FROM public.bilgiler
    WHERE embedding_vector IS NOT NULL
      AND gorunur_baslangic >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
    ORDER BY gorunur_baslangic DESC
    LIMIT 300;
  `;

  const { rows } = await pool.query(q, [days]);

  const topics = rows
    .map((r) =>
      (r.icerik || "")
        .split(/[.!?]/)[0]
        .split(/\s+/)
        .slice(0, 10)
        .join(" ")
    )
    .filter(Boolean);

  return Array.from(new Set(topics)).slice(0, 80);
}

// En yakın embedding mesafesini bulur
async function findNearest(vec, lookbackDays = SIM_LOOKBACK_DAYS) {
  if (!Array.isArray(vec)) {
    try {
      vec = JSON.parse(vec);
    } catch {
      console.error(
        "findNearest: vektör parse edilemedi:",
        typeof vec,
        vec?.slice?.(0, 60)
      );
      vec = [];
    }
  }

  const vectorParam = `[${vec.join(",")}]`;

  const q = `
    SELECT
      bilgi_id,
      icerik,
      (embedding_vector <=> $1::vector) AS dist
    FROM public.bilgiler
    WHERE embedding_vector IS NOT NULL
      AND gorunur_baslangic >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
    ORDER BY embedding_vector <=> $1::vector
    LIMIT 1;
  `;

  const { rows } = await pool.query(q, [vectorParam, lookbackDays]);
  return rows[0] || null;
}

// Bugün aynı metin zaten var mı kontrolü
async function existsSameTextToday(text) {
  const q = `
    SELECT 1
    FROM public.bilgiler
    WHERE gorunur_baslangic::date = CURRENT_DATE
      AND md5(lower(regexp_replace($1, '\\s+', ' ', 'g')))
        = md5(lower(regexp_replace(icerik, '\\s+', ' ', 'g')))
    LIMIT 1;
  `;

  const { rows } = await pool.query(q, [text]);
  return rows.length > 0;
}

// ✅ Görsel üret (hata olursa null)
async function tryGenerateImage(text) {
  for (let i = 1; i <= IMG_MAX_RETRY; i++) {
    try {
      const url = await generateImageForBilgi(text);
      if (url) return url;
    } catch (e) {
      console.error(`[image] generate try ${i} failed:`, e?.message || e);
    }
  }
  return null;
}

// Bilgiyi ekle
async function insertBilgi({ icerik, vec, start, end, kategori, image_url }) {
  if (!Array.isArray(vec)) {
    try {
      vec = JSON.parse(vec);
    } catch {
      console.error("Vektör JSON parse edilemedi:", typeof vec);
      vec = [];
    }
  }

  const vectorParam = `[${vec.join(",")}]`;

  const q = `
    INSERT INTO public.bilgiler (
      icerik,
      embedding_vector,
      image_url,
      gorunur_baslangic,
      gorunur_bitis,
      olusturulma_tarihi,
      kategori
    )
    VALUES ($1, $2::vector, $3, $4, $5, NOW(), $6)
    RETURNING bilgi_id;
  `;

  const { rows } = await pool.query(q, [
    icerik,
    vectorParam,
    image_url || null,
    start,
    end,
    kategori,
  ]);

  return rows[0]?.bilgi_id;
}


// Günlük bilgiler kontrol ederek oluşturma fonksiyonu
// Günlük bilgiler kontrol ederek oluşturma fonksiyonu
export async function generateAndStoreToday() {
  // Bugün daha önce bilgi üretilmiş mi?
  const preQuery = `
    SELECT COUNT(*)::int AS c
    FROM public.bilgiler
    WHERE gorunur_baslangic::date = CURRENT_DATE;
  `;
  const pre = await pool.query(preQuery);
  if (pre.rows[0].c >= 6) {
    return { status: "skipped", reason: "today_already_generated" };
  }

  const slots = getTodaySlots();
  const avoid = await recentTopicsForPrompt();

  // Sabit kategori listesi – slot sırasına göre
  const CATEGORIES = [
    "Tarih",
    "Bilim veya İcatlar",
    "Sanat",
    "Coğrafya",
    "Edebiyat veya Dil",
    "Spor veya Sağlık",
  ];

  const inserted = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const kategori = CATEGORIES[i] || "Genel";

    let tries = 0;
    let text = "";
    let imageUrl = null;

    while (true) {
      tries++;

      // Eğer önceki denemede text üretilmediyse, bu kategoride yeni metin iste
      if (!text) {
        try {
          text = await generateFactForCategory(kategori, avoid);
        } catch (e) {
          console.error("generateFactForCategory hata:", e);
          if (tries >= MAX_RETRY) {
            throw e;
          }
          continue;
        }
      }

      if (!text) {
        if (tries >= MAX_RETRY) {
          throw new Error("Boş metin üretildi, tekrar deneme sınırı aşıldı.");
        }
        text = "";
        continue;
      }

      // Aynı metin bugün var mı?
      if (await existsSameTextToday(text)) {
        if (tries >= MAX_RETRY) {
          throw new Error("Metin tekrarı engellenemedi");
        }
        text = ""; // yeni text üretelim
        continue;
      }

      // Anlamsal benzerlik kontrolü
      const vec = await embed(text);
      const nearest = await findNearest(vec);
      const tooSimilar = nearest && Number(nearest.dist) <= SIM_THRESHOLD;

      if (tooSimilar && tries < MAX_RETRY) {
        // Çok benzer → aynı kategoride yeni bilgi iste
        text = "";
        continue;
      }

      // Buraya geldiysek metni kabul ediyoruz
      try {
        // Image üretme işlemi
        imageUrl = await generateImageForBilgi(text);
      } catch (e) {
        console.error("generateImageForBilgi hata (devam ediyorum):", e);
      }

      const id = await insertBilgi({
        icerik: text,
        vec,
        start: slot.start,
        end: slot.end,
        kategori,
        image_url: imageUrl, // Görsel URL'sini DB'ye ekle
      });

      inserted.push(id);
      break;
    }
  }

  return {
    status: "ok",
    insertedCount: inserted.length,
    ids: inserted,
  };
}

