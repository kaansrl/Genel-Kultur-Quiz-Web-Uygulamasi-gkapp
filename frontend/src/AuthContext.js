// src/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  me,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
} from "./Api";

const AuthCtx = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Uygulama ilk açıldığında oturumu kontrol et
  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const res = await me();              // Api.js -> return res.data
        const data = res?.data ?? res;       // ikisini de tolere et

        if (!ignore && data && data.ok) {
          setUser(data.user);
        } else if (!ignore) {
          setUser(null);
        }
      } catch (e) {
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // ==== GİRİŞ ====
  const login = async (eposta, parola) => {
    // Eski XP (giriş öncesi) – user yoksa 0 kabul et
    const oldXp = user?.xp ?? 0;

    const res = await apiLogin({ eposta, parola }); // Api.login -> res.data döndürüyor
    const data = res?.data ?? res;

    console.log("DEBUG AuthContext.login data:", data);

    if (!data || !data.ok) {
      throw new Error(data?.error || "Giriş başarısız.");
    }

    const newUser = data.user;
    setUser(newUser);

    const newXp = newUser?.xp ?? oldXp;

    // Öncelik: backend'in loginXp alanı
    let xpEarned = 0;
    if (typeof data.loginXp === "number" && data.loginXp > 0) {
      xpEarned = data.loginXp;
    } else if (newXp > oldXp) {
      // loginXp gelmese bile, XP artmışsa fark kadar XP kazanmış say
      xpEarned = newXp - oldXp;
    }

    if (xpEarned > 0) {
      console.log("DEBUG AuthContext.login xpEarned:", xpEarned);

      window.dispatchEvent(
        new CustomEvent("xp-toast", {
          detail: {
            amount: xpEarned,
            message:
              typeof data.loginXp === "number" && data.loginXp > 0
                ? `Günlük giriş bonusu: +${xpEarned} XP!`
                : `XP'in arttı: +${xpEarned} XP!`,
          },
        })
      );
    }

    return newUser;
  };

  // ==== KAYIT ====
  const register = async ({ kullanici_adi, eposta, parola }) => {
    const res = await apiRegister({ kullanici_adi, eposta, parola });
    const data = res?.data ?? res;

    console.log("DEBUG AuthContext.register data:", data);

    if (!data || !data.ok) {
      throw new Error(data?.error || "Kayıt başarısız.");
    }

    const newUser = data.user;
    setUser(newUser);

    const newXp = newUser?.xp ?? 0;

    let xpEarned = 0;
    if (typeof data.loginXp === "number" && data.loginXp > 0) {
      xpEarned = data.loginXp;
    } else if (newXp > 0) {
      // Yeni kayıt olduysa ve XP > 0 ise, en azından bu kadar kazandı
      xpEarned = newXp;
    }

    if (xpEarned > 0) {
      window.dispatchEvent(
        new CustomEvent("xp-toast", {
          detail: {
            amount: xpEarned,
            message:
              typeof data.loginXp === "number" && data.loginXp > 0
                ? `Hoş geldin! +${xpEarned} XP kazandın!`
                : `XP'in arttı: +${xpEarned} XP!`,
          },
        })
      );
    }

    return newUser;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // önemli değil
    }
    setUser(null);
  };

  const value = { user, setUser, loading, login, register, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
