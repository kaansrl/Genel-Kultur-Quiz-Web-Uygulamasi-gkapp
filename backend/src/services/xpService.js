// src/services/xpService.js
import pool from "../db.js";

/**
 * Genel XP ekleme fonksiyonu.
 *
 * Seviye kuralı:
 * 0–299      → Acemi
 * 300–749    → Öğrenci
 * 750–1999   → Deneyimli
 * 2000–4999  → Uzman
 * 5000+      → Expert
 */
export async function addXp(kullaniciId, amount) {
  const xpInt = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  if (!kullaniciId || xpInt <= 0) return;

  const q = `
    UPDATE public.kullanicilar
    SET xp = COALESCE(xp, 0) + $1,
        seviye = CASE
          WHEN COALESCE(xp, 0) + $1 >= 5000 THEN 'Expert'
          WHEN COALESCE(xp, 0) + $1 >= 2000 THEN 'Uzman'
          WHEN COALESCE(xp, 0) + $1 >= 750  THEN 'Deneyimli'
          WHEN COALESCE(xp, 0) + $1 >= 300  THEN 'Öğrenci'
          ELSE 'Acemi'
        END
    WHERE kullanici_id = $2;
  `;
  await pool.query(q, [xpInt, kullaniciId]);
}

/**
 * 🟩 Bilgi okuma XP'si:
 * - Kullanıcı bir bilgiyi ilk kez okuduğunda XP ver
 * - Aynı bilgi için tekrar tekrar XP verme
 *
 * Kullandığı tablo:
 *
 *   CREATE TABLE IF NOT EXISTS public.bilgi_okuma_log (
 *     id            SERIAL PRIMARY KEY,
 *     kullanici_id  INTEGER NOT NULL REFERENCES public.kullanicilar(kullanici_id),
 *     bilgi_id      INTEGER NOT NULL REFERENCES public.bilgiler(bilgi_id),
 *     okuma_zamani  TIMESTAMP NOT NULL DEFAULT NOW(),
 *     UNIQUE (kullanici_id, bilgi_id)
 *   );
 */
const XP_FACT_READ = 2;

export async function addFactReadXp(kullaniciId, bilgiId) {
  if (!kullaniciId || !bilgiId) return 0;

  const checkQ = `
    SELECT 1
    FROM public.bilgi_okuma_log
    WHERE kullanici_id = $1
      AND bilgi_id = $2
    LIMIT 1;
  `;
  const checkRes = await pool.query(checkQ, [kullaniciId, bilgiId]);

  if (checkRes.rowCount > 0) {
    // Zaten bu bilgi için XP verilmiş
    return 0;
  }

  const insQ = `
    INSERT INTO public.bilgi_okuma_log (kullanici_id, bilgi_id)
    VALUES ($1, $2);
  `;
  await pool.query(insQ, [kullaniciId, bilgiId]);

  await addXp(kullaniciId, XP_FACT_READ);
  return XP_FACT_READ;
}

/**
 * 🟩 Giriş XP'si (generic fonksiyon)
 */
const XP_LOGIN = 5;

export async function addLoginXp(kullaniciId) {
  if (!kullaniciId) return 0;

  await addXp(kullaniciId, XP_LOGIN);
  return XP_LOGIN;
}

/**
 * 🟩 Günlük giriş XP'si:
 * - Aynı gün içinde sadece ilk girişte XP verir.
 *
 * Senin tablonun yapısı:
 *
 *   CREATE TABLE IF NOT EXISTS public.kullanici_giris_log (
 *     id           SERIAL PRIMARY KEY,
 *     kullanici_id INTEGER NOT NULL REFERENCES public.kullanicilar(kullanici_id),
 *     tarih        DATE NOT NULL,
 *     UNIQUE (kullanici_id, tarih)
 *   );
 */
export async function addDailyLoginXp(kullaniciId) {
  if (!kullaniciId) return 0;

  const checkQ = `
    SELECT 1
    FROM public.kullanici_giris_log
    WHERE kullanici_id = $1
      AND tarih = CURRENT_DATE
    LIMIT 1;
  `;

  try {
    const checkRes = await pool.query(checkQ, [kullaniciId]);
    if (checkRes.rowCount > 0) {
      // Bugün için daha önce XP verilmiş
      return 0;
    }

    const insQ = `
      INSERT INTO public.kullanici_giris_log (kullanici_id, tarih)
      VALUES ($1, CURRENT_DATE);
    `;
    await pool.query(insQ, [kullaniciId]);
  } catch (e) {
    console.warn("addDailyLoginXp uyarı:", e.message);
  }

  return await addLoginXp(kullaniciId);
}
