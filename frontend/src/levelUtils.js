// src/levelUtils.js

// Aynı seviyeleri Stats.js'te kullandığımız haliyle tanımlıyoruz
export const LEVELS = [
  { name: "Acemi",     minXp: 0,    maxXp: 300 },   // 0–299
  { name: "Öğrenci",   minXp: 300,  maxXp: 750 },   // 300–749
  { name: "Deneyimli", minXp: 750,  maxXp: 2000 },  // 750–1999
  { name: "Uzman",     minXp: 2000, maxXp: 5000 },  // 2000–4999
  { name: "Expert",    minXp: 5000, maxXp: null },  // 5000+
];

// Navbar ve diğer yerlerde kullanacağımız yardımcı fonksiyon
export function getLevelInfo(xp) {
  const safeXp = Number.isFinite(xp) ? xp : 0;
  let current = LEVELS[0];

  // Hangi seviyedeyiz?
  for (const lvl of LEVELS) {
    if (safeXp >= lvl.minXp) current = lvl;
  }

  // Bir sonraki seviye var mı?
  const next = LEVELS.find((lvl) => lvl.minXp > current.minXp) || null;

  // Seviye içi ilerleme yüzdesi
  let progress = 100;
  if (current.maxXp != null) {
    const span = current.maxXp - current.minXp;
    progress = span > 0 ? ((safeXp - current.minXp) / span) * 100 : 0;
  }

  return {
    current,
    next,
    progress: Math.max(0, Math.min(100, progress)),
  };
}
