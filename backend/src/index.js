// src/index.js
import dotenv from "dotenv";
dotenv.config();

console.log("CLIENT_ORIGIN =", process.env.CLIENT_ORIGIN);
console.log("SESSION_SECRET length =", process.env.SESSION_SECRET?.length);
console.log("OPENAI_API_KEY length =", process.env.OPENAI_API_KEY?.length);

import app from "./app.js";
import pool from "./db.js";
import { startBilgiCron } from "./jobs/bilgiCron.js";

import authRoutes from "./auth.routes.js";
import bilgilerRoutes from "./routes/bilgiler.js";
import quizlerRoutes from "./routes/quizler.js";
import istatistikRoutes from "./routes/istatistik.js";

// ✅ Route mount'ları SADECE burada
app.use("/api/auth", authRoutes);
app.use("/api/bilgiler", bilgilerRoutes);
app.use("/api/quizler", quizlerRoutes);
app.use("/api/istatistik", istatistikRoutes);

// DB test rotası
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});

// Cron
startBilgiCron();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
