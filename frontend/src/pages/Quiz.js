// src/pages/Quiz.js
import React, { useEffect, useState } from "react";
import { getTodayQuizStatus, submitTodayQuizAnswers } from "../Api";
import { useAuth } from "../AuthContext"; // 🔹 XP güncellemek için

export default function Quiz() {
  const { setUser } = useAuth(); // 🔹 Navbar’daki XP barını güncellemek için

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { soru_id: secenekIndex }
  const [submitted, setSubmitted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [initialScore, setInitialScore] = useState(null); // backend'den gelen skor
  const [alreadySolved, setAlreadySolved] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const data = await getTodayQuizStatus();
        console.log("DEBUG getTodayQuizStatus:", data);

        if (!data.ok || !data.quiz) {
          setError("Bugün için quiz bulunamadı.");
          setLoading(false);
          return;
        }

        const prepared = (data.sorular || [])
          .map((s) => {
            let payload;
            try {
              payload = JSON.parse(s.icerik);
            } catch {
              return null;
            }

            return {
              soru_id: s.soru_id,
              text: payload.soru,
              options: payload.secenekler || [],
              correctIndex: payload.dogruIndex ?? 0,
            };
          })
          .filter(Boolean);

        setQuestions(prepared);

        if (data.zatenCozmusMu) {
          const cevapMap = data.cevaplar || {};
          setAnswers(cevapMap);
          setSubmitted(true);
          setAlreadySolved(true);
          setInitialScore(
            typeof data.toplamDogru === "number" ? data.toplamDogru : null
          );
        }
      } catch (e) {
        console.error(e);
        setError("Quiz yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, []);

  const handleSelect = (soruId, optionIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [soruId]: optionIdx }));
  };

   const handleSubmit = async () => {
    if (submitted) return;

    try {
      const answerArray = Object.entries(answers).map(
        ([soru_id, secenekIndex]) => ({
          soru_id: Number(soru_id),
          secilenIndex: secenekIndex,
        })
      );

      console.log("DEBUG handleSubmit answerArray:", answerArray);

      if (answerArray.length === 0) {
        alert("Önce en az bir soru işaretlemelisin.");
        return;
      }

      const res = await submitTodayQuizAnswers(answerArray);
      console.log("DEBUG submitTodayQuizAnswers response:", res);

      if (!res.ok) {
        setError(res.error || "Cevaplar gönderilirken bir hata oluştu.");
        return;
      }

      // Eğer bugün zaten çözmüşse → XP verme, sadece sonucu göster
      if (res.alreadyAnswered) {
        setSubmitted(true);
        setAlreadySolved(true);
        if (typeof res.toplamDogru === "number") {
          setInitialScore(res.toplamDogru);
        }
        setShowResultModal(true);
        return;
      }

      // 🔹 Kaç XP kazandık? (backend xpEarned döndürüyor)
      const bonus =
        typeof res.xpEarned === "number"
          ? res.xpEarned
          : typeof res.toplamDogru === "number"
          ? res.toplamDogru * 5 // yedek: soru başı 5 XP
          : 0;

      if (bonus > 0) {
        // ✅ Navbar’daki XP barını güncelle
        setUser((prev) =>
          prev
            ? {
                ...prev,
                xp: (prev.xp ?? 0) + bonus,
              }
            : prev
        );

        // ✅ XP toast göster
        window.dispatchEvent(
          new CustomEvent("xp-toast", {
            detail: {
              amount: bonus,
              message: `Quiz performansınla +${bonus} XP kazandın!`,
            },
          })
        );
      }

      setSubmitted(true);
      setAlreadySolved(true);
      if (typeof res.toplamDogru === "number") {
        setInitialScore(res.toplamDogru);
      }
      setShowResultModal(true);
    } catch (e) {
      console.error(e);
      setError("Cevaplar gönderilirken bir hata oluştu.");
    }
  };


  const handleCloseModal = () => {
    setShowResultModal(false);
  };

  const totalQuestions = questions.length;
  let totalCorrect = 0;

  if (submitted && initialScore !== null) {
    totalCorrect = initialScore;
  } else {
    questions.forEach((q) => {
      if (answers[q.soru_id] === q.correctIndex) {
        totalCorrect += 1;
      }
    });
  }

  let resultTitle = "";
  let resultText = "";

  if (submitted) {
    if (totalCorrect === totalQuestions) {
      resultTitle = "Mükemmel! 🎉";
      resultText = `${totalQuestions}'da ${totalCorrect} yaptın, harikasın!`;
    } else if (totalCorrect === totalQuestions - 1) {
      resultTitle = "Çok iyi! 👏";
      resultText = `${totalQuestions}'da ${totalCorrect} yaptın, biraz daha dikkatle full gelebilirdi.`;
    } else if (totalCorrect >= Math.floor(totalQuestions * 0.66)) {
      resultTitle = "İyi iş! 💪";
      resultText = `${totalQuestions}'da ${totalCorrect} yaptın, gayet iyi bir sonuç.`;
    } else if (totalCorrect >= Math.floor(totalQuestions * 0.5)) {
      resultTitle = "Fena değil 🙂";
      resultText = `${totalQuestions}'da ${totalCorrect} yaptın, biraz daha pratikle çok daha iyi olur.`;
    } else if (totalCorrect >= 1) {
      resultTitle = "Denemek güzeldir 🌱";
      resultText = `${totalQuestions}'da ${totalCorrect} yaptın, vazgeçme; tekrar dene!`;
    } else {
      resultTitle = "Bu sefer olmadı 😢";
      resultText = `${totalQuestions}'da 0 yaptın, ama sorun değil; bilgi böyle böyle yerleşecek.`;
    }
  }

  if (loading) {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h2">Quiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Günlük Quiz</h1>
      </div>

      {alreadySolved && (
        <div className="card hero" style={{ marginTop: 12 }}>
          <p className="h2">
            Bu quiz&#39;i bugün zaten çözdün. Aşağıda sonuçlarını tekrar
            görebilirsin.
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <p className="h2">{questions.length} soru seni bekliyor!</p>

        {questions.map((q, qi) => (
          <div
            key={q.soru_id}
            className="quiz-question-block"
            style={{ marginTop: 24 }}
          >
            <h3 className="quiz-question-title">
              {qi + 1}. {q.text}
            </h3>

            <div className="quiz-options">
              {q.options.map((opt, oi) => {
                const userAnswer = answers[q.soru_id];
                const isCorrectOption = q.correctIndex === oi;

                let className = "quiz-option";

                if (!submitted && userAnswer === oi) {
                  className += " selected";
                }

                if (submitted) {
                  if (userAnswer === undefined || userAnswer === null) {
                    if (isCorrectOption) {
                      className += " unanswered";
                    }
                  } else if (userAnswer === q.correctIndex) {
                    if (isCorrectOption && userAnswer === oi) {
                      className += " correct";
                    }
                  } else {
                    if (userAnswer === oi) {
                      className += " wrong";
                    }
                    if (isCorrectOption) {
                      className += " unanswered";
                    }
                  }
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    className={className}
                    onClick={() => handleSelect(q.soru_id, oi)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {questions.length > 0 && (
          <div style={{ marginTop: 32, textAlign: "center" }}>
            {!submitted ? (
              <button className="btn" onClick={handleSubmit}>
                Quiz&#39;i Bitir
              </button>
            ) : (
              <div className="hero-hint">
                Toplam doğru:{" "}
                <strong>
                  {totalCorrect} / {totalQuestions}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      {submitted && showResultModal && (
        <div className="quiz-result-overlay">
          <div className="quiz-result-modal card">
            <h2 className="h1" style={{ marginBottom: 8 }}>
              {resultTitle}
            </h2>
            <p className="h2" style={{ marginBottom: 18 }}>
              {resultText}
            </p>
            <button className="btn" onClick={handleCloseModal}>
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
