// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./AuthContext";

import XpToast from "./components/XpToast";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import BilgiAktif from "./pages/BilgiAktif";
import BilgiGunluk from "./pages/BilgiGunluk";
import Quiz from "./pages/Quiz";
import Stats from "./pages/Stats";

import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* 🔒 Oturum zorunlu alanlar */}
            <Route element={<RequireAuth />}>
              <Route path="/bilgiler/aktif" element={<BilgiAktif />} />
              <Route path="/bilgiler/gunluk" element={<BilgiGunluk />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/istatistik" element={<Stats />} />
            </Route>
          </Routes>
        </div>

        {/* ✅ Her sayfada altta ortada görünen XP toast */}
        <XpToast />
      </BrowserRouter>
    </AuthProvider>
  );
}
