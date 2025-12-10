// backend/src/jobs/bilgiCron.js
import cron from "node-cron";
import pool from "../db.js";
import { generateAndStoreToday } from "../services/bilgiService.js";
import { generateQuestionsForTodayQuiz } from "../services/quizService.js";

let task = null;

// sabah 07:58 – 20:00 
function isWithinDailyWindow(d = new Date()) {
  const h = d.getHours();
  const m = d.getMinutes();
  const minutes = h * 60 + m;

  const start = 7 * 60 + 45; 
  const end   = 20 * 60 + 0; 

  return minutes >= start && minutes < end;
}

// Uygulama açılışında gerekiyorsa bugünün bilgilerini ve quizini üret
export async function runOnceIfNeeded() {
  try {
    if (!isWithinDailyWindow()) {
      console.log("[bilgiCron] Boot guard: 07:58–20:00 dışında → üretim YOK.");
      return;
    }

    const pre = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM public.bilgiler
      WHERE gorunur_baslangic::date = CURRENT_DATE;
    `);

    const c = pre.rows[0]?.c ?? 0;

    //bilgi tarafı
    if (c < 6) {
      console.log(
        `[bilgiCron] Boot guard: bugün ${c} kayıt var. şimdi yeni bilgiler üretiliyor.`
      );
      const result = await generateAndStoreToday();
      console.log("[bilgiCron] Boot guard bilgi result:", result);
    } else {
      console.log(
        `[bilgiCron] Boot guard: bugün zaten ${c} bilgi var. tekrar üretmiyorum.`
      );
    }

    // quiz tarafı
    const quizRes = await generateQuestionsForTodayQuiz();
    console.log("[bilgiCron] Boot guard quiz result:", quizRes);
  } catch (e) {
    console.error("[bilgiCron] runOnceIfNeeded error:", e);
  }
}

export function startBilgiCron() {
  if (task) return;

  // Her gün 07:58’de çalışsın
  task = cron.schedule(
    "58 7 * * *",
    async () => {
      try {
        console.log("[bilgiCron] 07:58 trigger → generateAndStoreToday()");
        const bilgiRes = await generateAndStoreToday();
        console.log("[bilgiCron] scheduled bilgi result:", bilgiRes);

        // bilgilerden sonra quiz üretimi. 
        const quizRes = await generateQuestionsForTodayQuiz();
        console.log("[bilgiCron] scheduled quiz result:", quizRes);
      } catch (e) {
        console.error("[bilgiCron] scheduled job error:", e);
      }
    },
    {
      timezone: process.env.TZ || "Europe/Istanbul",
    }
  );

  // Uygulama ilk açıldığında da bir kere kontrol et
  runOnceIfNeeded();

  console.log("Bilgi + quiz üretim cron'u başlatıldı");
}

export function stopBilgiCron() {
  if (task) {
    task.stop();
    task = null;
    console.log("[bilgiCron] stopped");
  }
}
