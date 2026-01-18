import React, { useEffect, useMemo, useState } from "react";
import {
  getTodayQuizStatus,
  submitTodayQuizAnswers,
  extractApiError,
} from "../Api";
import { useAuth } from "../AuthContext";

function minutesOfDay(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

function isAfterQuiz(d = new Date()) {
  return minutesOfDay(d) >= 20 * 60 + 15; // 20:15 sonrası
}

const LS_KEY = "gk_last_quiz_result_v1";
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function saveQuizResult({ totalCorrect, totalQuestions }) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        date: todayKey(),
        totalCorrect,
        totalQuestions,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {}
}
function readQuizResult() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj?.date !== todayKey()) return null;
    return obj;
  } catch {
    return null;
  }
}

export default function Quiz() {
  const { setUser } = useAuth();

  const now = useMemo(() => new Date(), []);
  const afterQuiz = isAfterQuiz(now);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [locked, setLocked] = useState(false);
  const [lockMode, setLockMode] = useState("before"); // before | after
  const [lockMessage, setLockMessage] = useState("");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [initialScore, setInitialScore] = useState(null);
  const [alreadySolved, setAlreadySolved] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const data = await getTodayQuizStatus();

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

          const score =
            typeof data.toplamDogru === "number" ? data.toplamDogru : null;
          setInitialScore(score);

          // ✅ bugün çözülü olan sonucu da kaydet
          if (typeof score === "number") {
            saveQuizResult({ totalCorrect: score, totalQuestions: prepared.length });
          }
        }
      } catch (err) {
        const e = extractApiError(err);

        if (e.status === 403) {
          setLocked(true);
          setLockMode(afterQuiz ? "after" : "before");

          if (afterQuiz) {
            setLockMessage(
              "Bugünün quiz’i tamamlandı. Yarın 20:00–20:15 arasında tekrar görüşmek üzere! ☺"
            );
          } else {
            setLockMessage("Quiz henüz başlamadı. Akşamki mücadelede görüşürüz!");
          }
        } else {
          console.error("Quiz hata:", e);
          setError("Quiz yüklenirken bir hata oluştu.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, [afterQuiz]);

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

      if (answerArray.length === 0) {
        alert("Önce en az bir soru işaretlemelisin.");
        return;
      }

      const res = await submitTodayQuizAnswers(answerArray);

      if (!res.ok) {
        setError(res.error || "Cevaplar gönderilirken bir hata oluştu.");
        return;
      }

      // Sonuç
      const totalQuestions = questions.length;
      const totalCorrect =
        typeof res.toplamDogru === "number"
          ? res.toplamDogru
          : answerArray.reduce((acc, a) => {
              const q = questions.find((qq) => qq.soru_id === a.soru_id);
              return acc + (q && a.secilenIndex === q.correctIndex ? 1 : 0);
            }, 0);

      // ✅ sonucu kaydet (20:15 sonrası kapanış ekranında göstermek için)
      saveQuizResult({ totalCorrect, totalQuestions });

      if (res.alreadyAnswered) {
        setSubmitted(true);
        setAlreadySolved(true);
        setInitialScore(totalCorrect);
        setShowResultModal(true);
        return;
      }

      const bonus =
        typeof res.xpEarned === "number"
          ? res.xpEarned
          : typeof totalCorrect === "number"
          ? totalCorrect * 5
          : 0;

      if (bonus > 0) {
        setUser((prev) =>
          prev ? { ...prev, xp: (prev.xp ?? 0) + bonus } : prev
        );

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
      setInitialScore(totalCorrect);
      setShowResultModal(true);
    } catch (err) {
      const e = extractApiError(err);
      if (e.status === 403) {
        setLocked(true);
        setLockMode(isAfterQuiz(new Date()) ? "after" : "before");
        setLockMessage(
          e.message || "Quiz şu an aktif değil. Quiz saati: 20:00–20:15"
        );
        return;
      }
      console.error("Submit hata:", e);
      setError("Cevaplar gönderilirken bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="container center">
        <div className="card hero">
          <p className="h2">Quiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (locked) {
    const saved = readQuizResult();
    const correct = saved?.totalCorrect;
    const total = saved?.totalQuestions;
    const wrong =
      typeof correct === "number" && typeof total === "number"
        ? total - correct
        : null;

    return (
      <div className="container center">
        <div className="card hero">
          {lockMode === "after" ? (
            <>
              <p className="h1"> Bugünün Quiz’i Tamamlandı! </p>
              <p className="h2" style={{ marginTop: 8 }}>
                {lockMessage}
              </p>

              {typeof correct === "number" && typeof wrong === "number" && (
                <div className="hero-hint" style={{ marginTop: 12 }}>
                  Bugünkü sonuç: <strong>{correct} doğru</strong> /{" "}
                  <strong>{wrong} yanlış</strong>
                </div>
              )}

              <div className="hero-hint" style={{ marginTop: 10 }}>
                Yarınki quiz: <strong>20:00 – 20:15</strong>
              </div>
            </>
          ) : (
            <>
              <p className="h1">⏰ Quiz Henüz Başlamadı</p>
              <p className="h2" style={{ marginTop: 8 }}>
                {lockMessage}
              </p>
              <div className="hero-hint" style={{ marginTop: 10 }}>
                Quiz saati: <strong>20:00 – 20:15</strong>
              </div>
            </>
          )}
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

  const totalQuestions = questions.length;
  let totalCorrect = 0;

  if (submitted && initialScore !== null) {
    totalCorrect = initialScore;
  } else {
    questions.forEach((q) => {
      if (answers[q.soru_id] === q.correctIndex) totalCorrect += 1;
    });
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
                if (!submitted && userAnswer === oi) className += " selected";

                if (submitted) {
                  if (userAnswer === undefined || userAnswer === null) {
                    if (isCorrectOption) className += " unanswered";
                  } else if (userAnswer === q.correctIndex) {
                    if (isCorrectOption && userAnswer === oi)
                      className += " correct";
                  } else {
                    if (userAnswer === oi) className += " wrong";
                    if (isCorrectOption) className += " unanswered";
                  }
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    className={className}
                    onClick={() => handleSelect(q.soru_id, oi)}
                    disabled={submitted}
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
              Tamamlandı!
            </h2>
            <p className="h2" style={{ marginBottom: 18 }}>
              Bugün <strong>{totalCorrect}</strong> doğru yaptın. Yarınki quiz için tekrar
              görüşmek üzere!
            </p>
            <button className="btn" onClick={() => setShowResultModal(false)}>
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
