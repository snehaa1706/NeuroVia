import { useState, useEffect, useRef, useCallback } from 'react';
import { submitLevel3, resumeAssessment } from '../api/screeningApi';

// === STROOP COMPONENT ===
function StroopTest({ stroopData, onComplete }) {
  const trials = stroopData?.trials || [];
  const totalTrials = stroopData?.total || 10;
  const timeLimitMs = stroopData?.time_limit_ms || 3000;
  const colorOptions = stroopData?.color_options || [];

  const [currentTrial, setCurrentTrial] = useState(0);
  const [responses, setResponses] = useState([]);
  const [phase, setPhase] = useState('intro');
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitMs);

  const trialStartRef = useRef(null);
  const timerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const trial = trials[currentTrial] || null;

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    
    trialStartRef.current = Date.now();
    setTimeLeft(timeLimitMs);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - trialStartRef.current;
      const remaining = Math.max(0, timeLimitMs - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [phase, currentTrial]);

  const startTest = () => {
    setPhase('active');
  };

  const handleTimeout = useCallback(() => {
    const resp = {
      answer: "",
      reaction_time_ms: timeLimitMs,
      timed_out: true,
      trial_index: currentTrial
    };
    recordResponse(resp, false);
  }, [currentTrial, timeLimitMs]);

  const handleColorClick = (colorName) => {
    if (phase !== 'active') return;
    clearInterval(timerRef.current);

    const reactionTime = Date.now() - trialStartRef.current;
    const isCorrect = colorName.toUpperCase() === trial.color.toUpperCase();

    const resp = {
      answer: colorName,
      reaction_time_ms: reactionTime,
      timed_out: false,
      trial_index: currentTrial
    };
    recordResponse(resp, isCorrect);
  };

  const recordResponse = (resp, isCorrect) => {
    setResponses(prev => [...prev, resp]);
    setFeedback({ correct: isCorrect, message: isCorrect ? '✅ Correct!' : resp.timed_out ? '⏱️ Time\'s up!' : '❌ Incorrect' });
    setPhase('feedback');

    feedbackTimerRef.current = setTimeout(() => {
      if (currentTrial + 1 >= totalTrials) {
        setPhase('done');
        onComplete([...responses, resp]);
      } else {
        setCurrentTrial(prev => prev + 1);
        setFeedback(null);
        setPhase('active');
      }
    }, 800);
  };

  const correctCount = responses.filter((r, i) => 
    r.answer.toUpperCase() === (trials[i]?.color || "").toUpperCase() && !r.timed_out
  ).length;

  const timerPercent = (timeLeft / timeLimitMs) * 100;
  const timerColor = timerPercent > 50 ? '#4caf50' : timerPercent > 25 ? '#ff9800' : '#f44336';

  if (phase === 'intro') {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h4 style={{ color: "#6f42c1", marginBottom: "15px" }}>How it works</h4>
        <div style={{ background: "#f5eef8", padding: "20px", borderRadius: "10px", marginBottom: "20px", textAlign: "left", maxWidth: "500px", margin: "0 auto 20px auto" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "15px", lineHeight: "1.6" }}>
            You will see <strong>color words</strong> displayed in <strong>different colors</strong>.
          </p>
          <p style={{ margin: "0 0 10px 0", fontSize: "15px", lineHeight: "1.6" }}>
            Your task: <strong>Select the COLOR of the text</strong>, NOT the word itself.
          </p>
          <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", textAlign: "center", margin: "15px 0" }}>
            <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#888" }}>Example:</p>
            <span style={{ fontSize: "32px", fontWeight: "900", color: "#198754" }}>RED</span>
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#555" }}>
              The word says "RED" but the color is <strong style={{ color: "#198754" }}>GREEN</strong>. 
              <br />You should tap <strong style={{ color: "#198754" }}>GREEN</strong>.
            </p>
          </div>
          <p style={{ margin: "0", fontSize: "14px", color: "#c0392b" }}>
            ⚡ You have <strong>{timeLimitMs / 1000} seconds</strong> per question. Be fast and accurate!
          </p>
        </div>
        <button onClick={startTest} style={{
          padding: "14px 32px", background: "linear-gradient(135deg, #6f42c1, #9b59b6)",
          color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
          fontSize: "17px", fontWeight: "bold", boxShadow: "0 4px 12px rgba(111,66,193,0.3)"
        }}>
          🧠 Start Stroop Test ({totalTrials} trials)
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const avgRt = responses.length > 0
      ? Math.round(responses.filter(r => !r.timed_out).reduce((s, r) => s + r.reaction_time_ms, 0) / Math.max(responses.filter(r => !r.timed_out).length, 1))
      : 0;
    const accuracy = Math.round((correctCount / totalTrials) * 100);
    const interpretation = accuracy >= 80 ? "Good" : accuracy >= 50 ? "Moderate" : "Needs Attention";
    const interpColor = accuracy >= 80 ? "#2e7d32" : accuracy >= 50 ? "#e65100" : "#c62828";

    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎯</div>
        <h4 style={{ color: "#6f42c1", marginBottom: "20px" }}>Stroop Test Complete</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "400px", margin: "0 auto 20px auto" }}>
          <div style={{ background: "#e8f5e9", padding: "15px", borderRadius: "8px" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2e7d32" }}>{correctCount}/{totalTrials}</div>
            <div style={{ fontSize: "13px", color: "#388e3c" }}>Correct</div>
          </div>
          <div style={{ background: "#e3f2fd", padding: "15px", borderRadius: "8px" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1565c0" }}>{avgRt}ms</div>
            <div style={{ fontSize: "13px", color: "#1976d2" }}>Avg React</div>
          </div>
          <div style={{ background: "#fff3e0", padding: "15px", borderRadius: "8px" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#e65100" }}>{accuracy}%</div>
            <div style={{ fontSize: "13px", color: "#ef6c00" }}>Accuracy</div>
          </div>
          <div style={{ background: "#fce4ec", padding: "15px", borderRadius: "8px" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: interpColor }}>{interpretation}</div>
            <div style={{ fontSize: "13px", color: "#c62828" }}>Assessment</div>
          </div>
        </div>
        <div style={{ background: "#e8f5e9", padding: "10px", borderRadius: "5px", color: "#2e7d32", fontWeight: "bold" }}>
          ✅ Stroop Test data locked
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "14px", color: "#666", fontWeight: "bold" }}>
          Question {currentTrial + 1} / {totalTrials}
        </span>
        <span style={{ fontSize: "14px", color: "#666" }}>
          ✅ {correctCount} correct
        </span>
      </div>

      <div style={{ width: "100%", height: "6px", background: "#e0e0e0", borderRadius: "3px", marginBottom: "15px" }}>
        <div style={{ width: `${((currentTrial + 1) / totalTrials) * 100}%`, height: "100%", background: "#6f42c1", borderRadius: "3px", transition: "width 0.3s" }} />
      </div>

      <div style={{ width: "100%", height: "8px", background: "#e0e0e0", borderRadius: "4px", marginBottom: "25px", overflow: "hidden" }}>
        <div style={{
          width: `${timerPercent}%`, height: "100%",
          background: timerColor, borderRadius: "4px",
          transition: "width 0.05s linear, background 0.3s"
        }} />
      </div>

      {trial && (
        <div style={{
          textAlign: "center", padding: "40px 20px", marginBottom: "25px",
          background: phase === 'feedback'
            ? (feedback?.correct ? 'rgba(46,125,50,0.08)' : 'rgba(198,40,40,0.08)')
            : '#fafafa',
          borderRadius: "12px",
          border: phase === 'feedback'
            ? `3px solid ${feedback?.correct ? '#4caf50' : '#f44336'}`
            : '2px solid #e0e0e0',
          transition: "all 0.2s"
        }}>
          <div style={{
            fontSize: "64px",
            fontWeight: "900",
            color: trial.color_hex,
            letterSpacing: "4px",
            textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
            userSelect: "none"
          }}>
            {trial.word}
          </div>
          {phase === 'feedback' && feedback && (
            <div style={{
              marginTop: "12px", fontSize: "18px", fontWeight: "bold",
              color: feedback.correct ? '#2e7d32' : '#c62828'
            }}>
              {feedback.message}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {colorOptions.map(opt => (
          <button
            key={opt.name}
            type="button"
            onClick={() => handleColorClick(opt.name)}
            disabled={phase !== 'active'}
            style={{
              padding: "18px",
              borderRadius: "12px",
              border: "3px solid " + opt.hex,
              background: opt.hex,
              color: opt.name === "YELLOW" ? "#333" : "#fff",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: phase === 'active' ? "pointer" : "not-allowed",
              opacity: phase === 'active' ? 1 : 0.5,
              transition: "all 0.15s",
              boxShadow: `0 3px 8px ${opt.hex}40`,
              letterSpacing: "1px"
            }}
          >
            {opt.name}
          </button>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: "12px", color: "#999", marginTop: "12px" }}>
        Select the COLOR of the text, not the word itself
      </p>
    </div>
  );
}


// === MAIN LEVEL 3 COMPONENT ===
export default function Level3({ assessmentId, initialContext, onNext }) {
  const assessment_id = assessmentId || localStorage.getItem("screening_assessmentId");

  const [level3Context, setLevel3Context] = useState(initialContext || null);

  useEffect(() => {
    if (!level3Context && assessment_id) {
      resumeAssessment().then(res => {
        if (res.level3_context) {
          setLevel3Context(res.level3_context);
        }
      }).catch(err => console.error("Could not resume Level 3 context:", err));
    }
  }, [level3Context, assessment_id]);

  const stroopData = level3Context?.stroop || null;

  const [loading, setLoading] = useState(false);
  const [previewBase64, setPreviewBase64] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [stroopResponses, setStroopResponses] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setError("");
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file (JPG, PNG, etc.)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Max 10MB.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleStroopComplete = (responses) => {
    setStroopResponses(responses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const payload = {
      clock_image_url: previewBase64 || "",
      stroop_responses: stroopResponses || []
    };

    try {
      const result = await submitLevel3(assessment_id, payload);
      onNext(result);
    } catch (err) {
      console.error("Level 3 submission error:", err);
      setError("Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!assessment_id) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
        <h3>No active assessment found.</h3>
        <p>Please go back and click <strong>Start Screening</strong>.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "750px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", borderBottom: "2px solid #6f42c1", paddingBottom: "10px", marginBottom: "30px" }}>
        Phase 3: Executive Function & Attention
      </h2>

      <form onSubmit={handleSubmit}>

        {stroopData && (
          <div style={{
            background: "#f3e5f5", padding: "20px", borderRadius: "8px",
            marginBottom: "25px", border: "1px solid #ce93d8"
          }}>
            <h3 style={{ marginTop: 0, color: "#6f42c1" }}>1. Stroop Color-Word Test</h3>
            <p style={{ color: "#7b1fa2", fontSize: "14px", marginBottom: "15px" }}>
              This test measures your <strong>attention</strong>, <strong>cognitive control</strong>, and <strong>response inhibition</strong> under time pressure.
            </p>
            <StroopTest stroopData={stroopData} onComplete={handleStroopComplete} />
          </div>
        )}

        <div style={{ background: "#e8daef", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #d2b4de" }}>
          <h3 style={{ marginTop: 0, color: "#6c3483" }}>{stroopData ? "2. " : ""}Clock Drawing Test (CDT)</h3>
          <p style={{ color: "#6c3483", fontSize: "14px", lineHeight: "1.6" }}>
            Assesses executive function, visuospatial ability, and cognitive planning.
          </p>
          <div style={{ background: "#f5eef8", padding: "15px", borderRadius: "5px", marginBottom: "15px" }}>
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "#4a235a" }}>Instructions for patient:</p>
            <ol style={{ margin: 0, paddingLeft: "20px", color: "#4a235a", fontSize: "14px", lineHeight: "1.8" }}>
              <li>Draw a large circle on a blank piece of paper</li>
              <li>Place all 12 numbers inside the circle as on a clock</li>
              <li>Draw hands showing <strong>"10 minutes past 11"</strong> (11:10)</li>
            </ol>
          </div>
          <p style={{ color: "#6c3483", fontSize: "14px", marginBottom: "15px" }}>
            Upload a photo or scan of the drawing below.
          </p>

          <div style={{
            background: "#f8f9fa", padding: "25px", borderRadius: "8px", marginBottom: "15px",
            border: previewBase64 ? "2px solid #28a745" : "2px dashed #ccc",
            textAlign: "center", transition: "border-color 0.3s"
          }}>
            <label htmlFor="clock-upload" style={{
              display: "inline-block", padding: "12px 28px",
              background: "#6f42c1", color: "white", borderRadius: "5px",
              cursor: "pointer", fontWeight: "bold", fontSize: "15px"
            }}>
              📷 {previewBase64 ? "Change Image" : "Upload Clock Drawing"}
            </label>
            <input id="clock-upload" type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            {fileName && <p style={{ color: "#666", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>Selected: {fileName}</p>}
          </div>

          {previewBase64 && (
            <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #dee2e6", textAlign: "center", marginBottom: "10px" }}>
              <p style={{ color: "#666", fontSize: "13px", marginTop: 0 }}>Preview:</p>
              <img src={previewBase64} alt="Clock Drawing" style={{ maxWidth: "100%", maxHeight: "350px", borderRadius: "5px", border: "1px solid #eee" }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "#f8d7da", color: "#721c24", padding: "12px 15px", borderRadius: "5px", marginBottom: "20px", border: "1px solid #f5c6cb", fontSize: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div style={{ background: "#fff3cd", color: "#856404", padding: "15px", borderRadius: "5px", marginBottom: "20px", border: "1px solid #ffeeba", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px", display: "inline-block", animation: "spin 1.5s linear infinite" }}>🧠</div>
            <p style={{ margin: 0, fontWeight: "bold" }}>Analyzing with Vision AI...</p>
            <p style={{ margin: "5px 0 0", fontSize: "13px" }}>This may take a few seconds.</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
          <button type="submit" disabled={loading} style={{
            padding: "15px 40px",
            background: loading ? "#6c757d" : "#6f42c1",
            color: "white", border: "none", borderRadius: "8px",
            fontSize: "18px", fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.3s",
            minWidth: "300px"
          }}>
            {loading ? "Analyzing..." : "Submit Level 3 Assessment"}
          </button>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
            You can submit even if some sections are unanswered — unanswered parts will be scored as 0.
          </p>
        </div>
      </form>
    </div>
  );
}
