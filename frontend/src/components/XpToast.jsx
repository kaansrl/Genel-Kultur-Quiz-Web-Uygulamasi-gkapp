// src/components/XpToast.jsx
import React, { useEffect, useState } from "react";

export default function XpToast() {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function handler(e) {
      const detail = e.detail || {};
      const amt = detail.amount ?? 0;
      const msg =
        detail.message ||
        (amt ? `+${amt} XP kazandın!` : "XP'in arttı!");

      setAmount(amt);
      setMessage(msg);
      setVisible(true);

      // 2.5 saniye sonra kaybolsun
      clearTimeout(window.__xpToastTimer);
      window.__xpToastTimer = setTimeout(() => {
        setVisible(false);
      }, 2500);
    }

    window.addEventListener("xp-toast", handler);
    return () => window.removeEventListener("xp-toast", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="xp-toast">
      {message}
    </div>
  );
}
