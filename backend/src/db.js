import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

// 🟩 XP EKLEME FONKSİYONU
export async function addXp(userId, amount) {
  try {
    await pool.query(
      `UPDATE kullanicilar SET xp = xp + $1 WHERE kullanici_id = $2`,
      [amount, userId]
    );
  } catch (err) {
    console.error("XP güncelleme hatası:", err);
  }
}

export default pool;
