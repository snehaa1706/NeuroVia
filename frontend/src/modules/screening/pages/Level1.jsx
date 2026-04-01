import { useState, useEffect } from 'react';
import { submitLevel1, resumeAssessment } from '../api/screeningApi';

const AD8_QUESTIONS = [
  "Problems with judgment (e.g., making decisions, bad financial choices)?",
  "Reduced interest in hobbies/activities?",
  "Repeats the same things over and over (questions, stories, or statements)?",
  "Trouble learning how to use a tool, appliance, or gadget?",
  "Forgets the correct month or year?",
  "Trouble handling complicated financial affairs (e.g., balancing checkbook, paying bills)?",
  "Trouble remembering appointments?",
  "Daily problems with thinking and/or memory?"
];

// Styles
const mcqBtnStyle = (isSelected) => ({
  padding: "16px 20px",
  borderRadius: "10px",
  border: isSelected ? "3px solid #007BFF" : "2px solid #dee2e6",
  background: isSelected
    ? "linear-gradient(135deg, #007BFF, #0056b3)"
    : "#fff",
  color: isSelected ? "#fff" : "#333",
  fontSize: "17px",
  fontWeight: isSelected ? "bold" : "500",
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: isSelected
    ? "0 4px 12px rgba(0, 123, 255, 0.3)"
    : "0 1px 3px rgba(0,0,0,0.08)",
  transform: isSelected ? "scale(1.03)" : "scale(1)",
  minHeight: "54px",
  textAlign: "center"
});

export default function Level1({ assessmentId, initialContext, onNext }) {
  const assessment_id = assessmentId || localStorage.getItem("screening_assessmentId");

  // Level 1 context from backend
  const [level1Context, setLevel1Context] = useState(initialContext || null);

  useEffect(() => {
    if (!level1Context && assessment_id) {
      resumeAssessment().then(res => {
        if (res.level1_context) {
          setLevel1Context(res.level1_context);
        }
      }).catch(err => console.error("Could not resume Level 1 context:", err));
    }
  }, [level1Context, assessment_id]);

  const orientationQuestions = level1Context?.orientation?.questions || [];
  const recallWords = level1Context?.recall_words || [];

  // Flow State
  const [step, setStep] = useState('memorize');
  const [loading, setLoading] = useState(false);

  // Form State
  const [ad8, setAd8] = useState(Array(8).fill(null));
  const [orientationAnswers, setOrientationAnswers] = useState({});
  const [recall, setRecall] = useState("");
  const [dontRememberRecall, setDontRememberRecall] = useState(false);

  const handleAd8Change = (index, value) => {
    const newAd8 = [...ad8];
    newAd8[index] = value;
    setAd8(newAd8);
  };

  const handleOrientationSelect = (questionId, value) => {
    setOrientationAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e, forceNoRecall = false) => {
    if (e) e.preventDefault();

    setLoading(true);

    const noRecall = forceNoRecall || dontRememberRecall;

    const ad8_answers = {};
    ad8.forEach((val, i) => {
      ad8_answers[`q${i + 1}`] = val === true;
    });

    const hasNoRecallInput = recall.trim() === '' && !noRecall;
    const payload = {
      ad8_answers,
      orientation_answers: orientationAnswers,
      recall_words: {
        response: (noRecall || hasNoRecallInput) ? [] : recall.split(',').map(w => w.trim()).filter(w => w),
        dont_remember: noRecall || hasNoRecallInput
      },
    };

    try {
      const result = await submitLevel1(assessment_id, payload);
      setDontRememberRecall(false);
      onNext(result.level2_context || null);
    } catch (err) {
      alert("Error submitting Level 1: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (!assessment_id) return <div style={{ padding: "20px", textAlign: "center" }}>No active assessment ID found. Please go back and hit Start Screening.</div>;

  // --- MEMORY REGISTRATION PHASE ---
  if (step === 'memorize') {
    return (
      <div style={{ padding: "40px 20px", maxWidth: "600px", margin: "auto", textAlign: "center", background: "#f8f9fa", borderRadius: "10px", marginTop: "30px", border: "1px solid #ddd" }}>
        <h2 style={{ color: "#333", marginBottom: "30px" }}>Phase 1: Foundation</h2>
        <div style={{ padding: "20px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ color: "#007BFF" }}>Memory Registration</h3>
          <p style={{ fontSize: "18px", marginBottom: "10px" }}>Please read and remember the following words:</p>
          <div style={{ fontSize: "24px", fontWeight: "bold", background: "#e9ecef", padding: "15px", borderRadius: "5px", letterSpacing: "2px", margin: "20px 0" }}>
            {recallWords.map(w => w.toUpperCase()).join(" - ")}
          </div>
          <button
            onClick={() => setStep('test')}
            style={{ padding: "12px 25px", background: "#28A745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>
            I have memorized the words
          </button>
        </div>
      </div>
    );
  }

  // --- TESTING PHASE ---
  return (
    <div style={{ padding: "20px", maxWidth: "750px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", borderBottom: "2px solid #007BFF", paddingBottom: "10px", marginBottom: "30px" }}>Phase 1: Foundation Testing</h2>

      <form onSubmit={handleSubmit}>

        {/* === AD8 === */}
        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #dee2e6" }}>
          <h3 style={{ marginTop: 0, color: "#333" }}>1. Eight-item Informant Interview (AD8)</h3>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>Has there been a change in the patient's memory, problem-solving abilities, or orientation?</p>

          {AD8_QUESTIONS.map((question, i) => (
            <div key={i} style={{ marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "500" }}>{i + 1}. {question}</p>
              <div>
                <label style={{ marginRight: "20px", cursor: "pointer" }}>
                  <input type="radio" name={`ad8-${i}`} checked={ad8[i] === true} onChange={() => handleAd8Change(i, true)} style={{ marginRight: "5px" }} />
                  Yes (A change)
                </label>
                <label style={{ cursor: "pointer" }}>
                  <input type="radio" name={`ad8-${i}`} checked={ad8[i] === false} onChange={() => handleAd8Change(i, false)} style={{ marginRight: "5px" }} />
                  No (No change)
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* === ORIENTATION (MCQ) === */}
        <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #bbdefb" }}>
          <h3 style={{ marginTop: 0, color: "#1565c0" }}>2. Orientation</h3>
          <p style={{ color: "#1976d2", fontSize: "14px", marginBottom: "20px" }}>Please select the best answer for each question.</p>

          {orientationQuestions.length === 0 && (
            <div style={{ background: "#fff3cd", padding: "12px", borderRadius: "5px", color: "#856404", fontSize: "14px", marginBottom: "15px" }}>
              ⚠️ Orientation questions were not loaded. Please go back and start a new screening.
            </div>
          )}

          {orientationQuestions.map((q, idx) => (
            <div key={q.id} style={{ marginBottom: "24px", background: "#f5f9ff", padding: "16px", borderRadius: "10px", border: "1px solid #e3edf7" }}>
              <p style={{ fontWeight: "700", fontSize: "17px", marginBottom: "14px", color: "#0d47a1" }}>
                ❓ {idx + 1}. {q.label}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {q.options.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleOrientationSelect(q.id, opt)}
                    style={mcqBtnStyle(orientationAnswers[q.id] === opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* === MEMORY RECALL === */}
        <div style={{ background: "#e2f0d9", padding: "20px", borderRadius: "8px", marginBottom: "30px", border: "1px solid #c3e6cb" }}>
          <h3 style={{ marginTop: 0, color: "#155724" }}>3. Memory Recall</h3>
          <p style={{ color: "#155724", fontSize: "14px", marginBottom: "15px" }}>Enter the words you memorized earlier.</p>
          <input
            type="text"
            placeholder="e.g., word1, word2, word3"
            value={recall}
            onChange={(e) => setRecall(e.target.value)}
            disabled={dontRememberRecall}
            style={{ width: "100%", padding: "12px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc", fontSize: "16px", backgroundColor: dontRememberRecall ? "#e9ecef" : "white", marginBottom: "20px" }}
          />
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6c757d" : "#007BFF",
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
            >
              {loading ? "Analyzing..." : "Submit"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setDontRememberRecall(true);
                setRecall("");
                handleSubmit(null, true);
              }}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6c757d" : "#dc3545",
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
            >
              {loading ? "Analyzing..." : "I Don't Remember"}
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "#666", margin: "12px 0 0 0", textAlign: "center" }}>
            You can submit even if some sections are unanswered — unanswered parts will be scored as 0.
          </p>
        </div>
      </form>
    </div>
  );
}
