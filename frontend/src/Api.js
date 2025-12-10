// src/Api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL + "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// --- Auth ---
export async function register(data) {
  const res = await api.post("/auth/register", data);
  return res.data; // { ok, user, error? }
}

export async function login(data) {
  const res = await api.post("/auth/login", data);
  return res.data; // { ok, user, error? }
}

export async function me() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function logout() {
  const res = await api.post("/auth/logout");
  return res.data;
}

// --- Bilgiler ---
export async function getAktifBilgi() {
  const res = await api.get("/bilgiler/aktif");
  return res.data;
}

export async function getGunlukBilgi(date) {
  const res = await api.get("/bilgiler/gunluk", { params: { date } });
  return res.data;
}

// ✅ YENİ: Bilgi okundu → XP isteği
export async function markBilgiOkundu(bilgiId) {
  const res = await api.post("/bilgiler/okundu", { bilgiId });
  return res.data; // { ok, xpEarned }
}

// --- Quiz ---
export async function getTodayQuiz() {
  const res = await api.get("/quizler/bugun");
  return res.data;
}

export async function getTodayQuizStatus() {
  const res = await api.get("/quizler/bugun/durum");
  return res.data;
}

export async function submitTodayQuizAnswers(answersArray) {
  const res = await api.post("/quizler/bugun/cevapla", { answers: answersArray });
  return res.data;
}

// --- İstatistik ---
export async function getMyStats() {
  const res = await api.get("/istatistik/ben");
  return res.data;
}

export async function getMyStatsComment() {
  const res = await api.get("/istatistik/ben/yorum");
  return res.data;
}

export async function getLeaderboard() {
  const res = await api.get("/istatistik/leaderboard");
  return res.data;
}

export default api;
