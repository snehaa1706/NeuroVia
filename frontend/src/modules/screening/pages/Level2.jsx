import { useState, useEffect, useRef, useCallback } from 'react';
import { submitLevel2, transcribeAudio, resumeAssessment } from '../api/screeningApi';

export default function Level2({ assessmentId, initialContext, onNext }) {
  const assessment_id = assessmentId || localStorage.getItem("screening_assessmentId");

  // --- Level 2 Context from backend ---
  const [level2Context, setLevel2Context] = useState(initialContext || null);

  useEffect(() => {
    if (!level2Context && assessment_id) {
      resumeAssessment().then(res => {
        if (res.level2_context) {
          setLevel2Context(res.level2_context);
        }
      }).catch(err => console.error("Could not resume context:", err));
    }
  }, [level2Context, assessment_id]);

  const digitSequence = level2Context?.digit_span?.sequence || "";
  const displayDuration = level2Context?.digit_span?.display_duration || 4000;
  const vrData = level2Context?.visual_recognition || null;
  const patternData = level2Context?.visual_pattern || null;
  const fluencyData = level2Context?.verbal_fluency || null;
  const fluencyCategory = fluencyData?.category || "animals";
  const fluencyInstruction = fluencyData?.instruction || `Name as many ${fluencyCategory} as you can in 60 seconds.`;

  // --- General ---
  const [loading, setLoading] = useState(false);
  const [delayedRecall, setDelayedRecall] = useState("");
  const [dontRememberDelayedRecall, setDontRememberDelayedRecall] = useState(false);

  // --- Verbal Fluency State ---
  const [inputMode, setInputMode] = useState('idle');
  const [transcript, setTranscript] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [micAvailable, setMicAvailable] = useState(true);

  // --- Digit Span State ---
  const [digitSpanPhase, setDigitSpanPhase] = useState('ready');
  const [showSequence, setShowSequence] = useState(false);
  const [digitForward, setDigitForward] = useState("");
  const [digitBackward, setDigitBackward] = useState("");
  const [dontRememberDigitForward, setDontRememberDigitForward] = useState(false);
  const [dontRememberDigitBackward, setDontRememberDigitBackward] = useState(false);
  const [digitCountdown, setDigitCountdown] = useState(0);

  // --- Visual Recognition State ---
  const [vrPhase, setVrPhase] = useState('ready');
  const [vrCountdown, setVrCountdown] = useState(0);
  const [vrSelected, setVrSelected] = useState([]);

  // --- Visual Pattern State ---
  const [selectedPatternAnswer, setSelectedPatternAnswer] = useState("");

  // --- Audio Refs ---
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIdRef = useRef(null);

  // === TIMER (Verbal Fluency) ===
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerIdRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      setTimerDone(true);
      if (inputMode === 'recording') {
        stopRecordingAndTranscribe();
      }
    }
    return () => clearTimeout(timerIdRef.current);
  }, [timerActive, timeLeft, inputMode]);

  // === VERBAL FLUENCY HANDLERS ===
  const startTimer = useCallback(() => {
    setTimerActive(true);
    setTimerDone(false);
    setTimeLeft(60);
  }, []);

  const startTypingMode = () => {
    setInputMode('typing');
    startTimer();
  };

  const startVoiceMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start();
      setInputMode('recording');
      setStatusMsg("🎙️ Recording... Speak now");
      startTimer();
    } catch (err) {
      setMicAvailable(false);
      setStatusMsg("Microphone unavailable. Use typing mode.");
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!mediaRecorderRef.current) return;
    setInputMode('transcribing');
    setStatusMsg("Processing audio...");
    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    await new Promise(r => setTimeout(r, 500));
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    try {
      const result = await transcribeAudio(blob);
      setTranscript(result.text || "");
      setStatusMsg("✅ Transcription complete");
    } catch (err) {
      setStatusMsg("❌ Transcription failed. Type your answers.");
    }
    setInputMode('done');
  };

  const processedAnimals = (inputMode === 'typing' || inputMode === 'done')
    ? transcript.split(',').map(a => a.trim()).filter(a => a.length > 0)
    : transcript.split(',').map(a => a.trim()).filter(a => a.length > 0);

  // === DIGIT SPAN HANDLERS ===
  const startDigitSpan = () => {
    setDigitSpanPhase('showing');
    setShowSequence(true);
    const totalSec = Math.ceil(displayDuration / 1000);
    setDigitCountdown(totalSec);
    const interval = setInterval(() => {
      setDigitCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    setTimeout(() => {
      setShowSequence(false);
      setDigitSpanPhase('input');
      clearInterval(interval);
    }, displayDuration);
  };

  // === VISUAL RECOGNITION HANDLERS ===
  const startVisualRecognition = () => {
    if (!vrData) return;
    setVrPhase('encoding');
    const durationMs = vrData.display_duration || 6000;
    const totalSec = Math.ceil(durationMs / 1000);
    setVrCountdown(totalSec);
    const interval = setInterval(() => {
      setVrCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    setTimeout(() => {
      setVrPhase('recognition');
      clearInterval(interval);
    }, durationMs);
  };

  const toggleVrSelection = (id) => {
    setVrSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const confirmVrSelection = () => {
    setVrPhase('done');
  };

  // === SUBMIT ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const hasNoDigitForward = digitForward.trim() === '' && !dontRememberDigitForward;
    const hasNoDigitBackward = digitBackward.trim() === '' && !dontRememberDigitBackward;
    const hasNoDelayedRecall = delayedRecall.trim() === '' && !dontRememberDelayedRecall;

    const payload = {
      animals: processedAnimals,
      digit_span_forward: {
        response: (dontRememberDigitForward || hasNoDigitForward) ? "" : digitForward,
        dont_remember: dontRememberDigitForward || hasNoDigitForward
      },
      digit_span_backward: {
        response: (dontRememberDigitBackward || hasNoDigitBackward) ? "" : digitBackward,
        dont_remember: dontRememberDigitBackward || hasNoDigitBackward
      },
      visual_recognition_selected: vrSelected,
      pattern_answer: selectedPatternAnswer,
      delayed_recall: {
        response: (dontRememberDelayedRecall || hasNoDelayedRecall) ? [] : delayedRecall.split(',').map(w => w.trim()).filter(w => w),
        dont_remember: dontRememberDelayedRecall || hasNoDelayedRecall
      }
    };

    try {
      const result = await submitLevel2(assessment_id, payload);
      if (result.next_step === "COMPLETE" || result.current_level !== 3) {
        onNext(null, result);
      } else {
        onNext(result.level3_context, null);
      }
    } catch (err) {
      alert("Error submitting Level 2: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!assessment_id) {
    return <div style={{ padding: "20px", textAlign: "center" }}>No active assessment ID. Go back and Start Screening.</div>;
  }

  if (!level2Context) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontSize: "18px", color: "#666" }}>
        Loading Phase 2 Assessment Context...
      </div>
    );
  }

  const fmt = (s) => String(s).padStart(2, '0');

  const selBtnStyle = (isActive) => ({
    padding: "18px",
    borderRadius: "12px",
    border: isActive ? "3px solid #e65100" : "2px solid #e0e0e0",
    background: isActive ? "linear-gradient(135deg, #ff9800, #f57c00)" : "#fff",
    color: isActive ? "#fff" : "#333",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: isActive ? "0 4px 12px rgba(230,81,0,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
    transform: isActive ? "scale(1.04)" : "scale(1)",
    textAlign: "center"
  });

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", borderBottom: "2px solid #2e7d32", paddingBottom: "10px", marginBottom: "30px" }}>
        Phase 2: Mild Cognitive Impairment (MCI) Testing
      </h2>

      <form onSubmit={handleSubmit}>

        {/* ===== SECTION 1: VERBAL FLUENCY ===== */}
        <div style={{ background: "#fffde7", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #fff9c4" }}>
          <h3 style={{ marginTop: 0, color: "#f57f17" }}>1. Semantic Verbal Fluency ({fluencyCategory.charAt(0).toUpperCase() + fluencyCategory.slice(1)})</h3>
          <p style={{ color: "#666", fontSize: "14px" }}>{fluencyInstruction}</p>

          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", background: "#fff", padding: "8px 16px", borderRadius: "6px", border: "1px solid #ddd" }}>
              {fmt(Math.floor(timeLeft / 60))}:{fmt(timeLeft % 60)}
            </div>
            {inputMode === 'idle' && (
              <>
                <button type="button" onClick={startVoiceMode} disabled={!micAvailable} style={{ padding: "10px 20px", background: micAvailable ? "#28a745" : "#aaa", color: "white", border: "none", borderRadius: "5px", cursor: micAvailable ? "pointer" : "not-allowed", fontSize: "15px", fontWeight: "bold" }}>
                  🎤 Start with Voice
                </button>
                <button type="button" onClick={startTypingMode} style={{ padding: "10px 20px", background: "#17a2b8", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "15px", fontWeight: "bold" }}>
                  ⌨️ Start with Typing
                </button>
              </>
            )}
          </div>

          {statusMsg && <p style={{ color: "#555", fontStyle: "italic", fontSize: "14px" }}>{statusMsg}</p>}

          {(inputMode === 'typing' || inputMode === 'done') && (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`Type ${fluencyCategory} separated by commas: item1, item2, item3...`}
              rows={3}
              style={{ width: "100%", padding: "12px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", resize: "vertical" }}
            />
          )}

          {inputMode === 'recording' && !timerDone && (
            <button type="button" onClick={stopRecordingAndTranscribe} style={{ padding: "10px 20px", background: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
              ⏹️ Stop Recording
            </button>
          )}

          {inputMode === 'transcribing' && (
            <div style={{ background: "#e8f5e9", padding: "12px", borderRadius: "5px", color: "#2e7d32" }}>⏳ Processing your recording...</div>
          )}

          {inputMode === 'done' && transcript && (
            <div style={{ marginTop: "10px" }}>
              <p style={{ fontWeight: "bold", color: "#333", marginBottom: "5px" }}>Transcribed (edit if needed):</p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", fontSize: "15px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }}
              />
            </div>
          )}

          {processedAnimals.length > 0 && (
            <p style={{ fontSize: "13px", color: "#888", marginTop: "5px" }}>{fluencyCategory.charAt(0).toUpperCase() + fluencyCategory.slice(1)} detected: {processedAnimals.length}</p>
          )}
        </div>

        {/* ===== SECTION 2: DIGIT SPAN ===== */}
        <div style={{ background: "#e8eaf6", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #c5cae9" }}>
          <h3 style={{ marginTop: 0, color: "#283593" }}>2. Digit Span Test</h3>
          <p style={{ color: "#3949ab", fontSize: "14px" }}>
            A sequence of numbers will appear briefly. Memorize them, then enter them <strong>forward</strong> and <strong>backward</strong>.
          </p>

          {digitSpanPhase === 'ready' && (
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <p style={{ color: "#5c6bc0", fontSize: "14px" }}>
                When you click the button below, a sequence of <strong>{digitSequence.length} digits</strong> will appear for <strong>{displayDuration / 1000} seconds</strong>. Memorize them carefully.
              </p>
              <button type="button" onClick={startDigitSpan} style={{ padding: "14px 28px", background: "#3f51b5", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>
                🧠 Begin Digit Span Test
              </button>
            </div>
          )}

          {digitSpanPhase === 'showing' && showSequence && (
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <div style={{ fontSize: "48px", fontWeight: "bold", letterSpacing: "20px", color: "#1a237e", background: "#e8eaf6", padding: "25px", borderRadius: "10px", fontFamily: "monospace" }}>
                {digitSequence}
              </div>
              <p style={{ color: "#5c6bc0", marginTop: "10px", fontSize: "16px" }}>⏱️ Memorize — {digitCountdown}s remaining</p>
            </div>
          )}

          {digitSpanPhase === 'input' && (
            <div style={{ margin: "15px 0" }}>
              <p style={{ fontWeight: "bold", color: "#283593", marginBottom: "10px" }}>The sequence has been hidden. Now enter it:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label style={{ fontWeight: "500", display: "block", marginBottom: "5px", color: "#3949ab" }}>Forward (left to right):</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={digitForward} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setDigitForward(e.target.value); }}
                    disabled={dontRememberDigitForward}
                    style={{ width: "100%", padding: "12px", fontSize: "20px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #ccc", fontFamily: "monospace", letterSpacing: "8px", textAlign: "center", backgroundColor: dontRememberDigitForward ? "#e9ecef" : "white", marginBottom: "10px" }}
                    placeholder="e.g. 7392" />
                  <button type="button" onClick={() => { setDontRememberDigitForward(!dontRememberDigitForward); if(!dontRememberDigitForward) setDigitForward(""); }} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: dontRememberDigitForward ? "2px solid #dc3545" : "1px solid #ccc", background: dontRememberDigitForward ? "#dc3545" : "#f8f9fa", color: dontRememberDigitForward ? "white" : "#333", cursor: "pointer", fontWeight: "bold" }}>I Don't Remember</button>
                </div>
                <div>
                  <label style={{ fontWeight: "500", display: "block", marginBottom: "5px", color: "#3949ab" }}>Backward (right to left):</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={digitBackward} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setDigitBackward(e.target.value); }}
                    disabled={dontRememberDigitBackward}
                    style={{ width: "100%", padding: "12px", fontSize: "20px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #ccc", fontFamily: "monospace", letterSpacing: "8px", textAlign: "center", backgroundColor: dontRememberDigitBackward ? "#e9ecef" : "white", marginBottom: "10px" }}
                    placeholder="e.g. 2937" />
                  <button type="button" onClick={() => { setDontRememberDigitBackward(!dontRememberDigitBackward); if(!dontRememberDigitBackward) setDigitBackward(""); }} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: dontRememberDigitBackward ? "2px solid #dc3545" : "1px solid #ccc", background: dontRememberDigitBackward ? "#dc3545" : "#f8f9fa", color: dontRememberDigitBackward ? "white" : "#333", cursor: "pointer", fontWeight: "bold" }}>I Don't Remember</button>
                </div>
              </div>
              {((digitForward || dontRememberDigitForward) && (digitBackward || dontRememberDigitBackward)) && (
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <button type="button" onClick={() => setDigitSpanPhase('done')} style={{ padding: "10px 24px", background: "#4caf50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                    ✅ Lock Answers
                  </button>
                </div>
              )}
            </div>
          )}

          {digitSpanPhase === 'done' && (
            <div style={{ background: "#e8f5e9", padding: "10px 15px", borderRadius: "5px", color: "#2e7d32", fontWeight: "bold", marginTop: "10px" }}>
              ✅ Digit Span answers locked (Forward: {digitForward}, Backward: {digitBackward})
            </div>
          )}
        </div>

        {/* ===== SECTION 3: VISUAL RECOGNITION ===== */}
        {vrData && (
          <div style={{ background: "#fce4ec", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #f8bbd0" }}>
            <h3 style={{ marginTop: 0, color: "#c62828" }}>3. Visual Recognition</h3>
            <p style={{ color: "#d32f2f", fontSize: "14px" }}>
              You will see a set of objects. Memorize them, then identify which ones you saw from a mixed set.
            </p>

            {vrPhase === 'ready' && (
              <div style={{ textAlign: "center", margin: "20px 0" }}>
                <p style={{ color: "#e53935", fontSize: "14px" }}>
                  You will see <strong>{vrData.targets?.length || 4} objects</strong> for <strong>{(vrData.display_duration || 6000) / 1000} seconds</strong>. Memorize them carefully.
                </p>
                <button type="button" onClick={startVisualRecognition} style={{ padding: "14px 28px", background: "#c62828", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>
                  👁️ Begin Visual Recognition
                </button>
              </div>
            )}

            {vrPhase === 'encoding' && (
              <div style={{ textAlign: "center", margin: "20px 0" }}>
                <p style={{ color: "#c62828", fontSize: "16px", fontWeight: "bold", marginBottom: "15px" }}>⏱️ Memorize these — {vrCountdown}s remaining</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px", maxWidth: "400px", margin: "0 auto" }}>
                  {vrData.targets?.map(obj => (
                    <div key={obj.id} style={{
                      background: "#fff", borderRadius: "12px", padding: "20px 10px",
                      textAlign: "center", border: "2px solid #ef9a9a",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}>
                      <div style={{ fontSize: "52px", marginBottom: "8px" }}>{obj.emoji}</div>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>{obj.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vrPhase === 'recognition' && (
              <div style={{ margin: "15px 0" }}>
                <p style={{ fontWeight: "bold", color: "#c62828", marginBottom: "12px", fontSize: "15px" }}>
                  Select ALL the objects you remember seeing:
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  {vrData.mixed_set?.map(obj => {
                    const isSelected = vrSelected.includes(obj.id);
                    return (
                      <button key={obj.id} type="button" onClick={() => toggleVrSelection(obj.id)}
                        style={{
                          padding: "16px 8px", borderRadius: "12px",
                          border: isSelected ? "3px solid #c62828" : "2px solid #e0e0e0",
                          background: isSelected ? "#ffebee" : "#fff",
                          cursor: "pointer", textAlign: "center",
                          transition: "all 0.2s",
                          boxShadow: isSelected ? "0 3px 10px rgba(198,40,40,0.2)" : "0 1px 3px rgba(0,0,0,0.08)"
                        }}>
                        <div style={{ fontSize: "40px", marginBottom: "6px" }}>{obj.emoji}</div>
                        <div style={{ fontSize: "14px", fontWeight: isSelected ? "bold" : "500", color: isSelected ? "#c62828" : "#555" }}>{obj.label}</div>
                        {isSelected && <div style={{ marginTop: "4px", color: "#c62828", fontSize: "12px" }}>✅ Selected</div>}
                      </button>
                    );
                  })}
                </div>
                {vrSelected.length > 0 && (
                  <div style={{ textAlign: "center", marginTop: "15px" }}>
                    <button type="button" onClick={confirmVrSelection} style={{ padding: "10px 24px", background: "#4caf50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                      ✅ Confirm Selection ({vrSelected.length} selected)
                    </button>
                  </div>
                )}
              </div>
            )}

            {vrPhase === 'done' && (
              <div style={{ background: "#e8f5e9", padding: "10px 15px", borderRadius: "5px", color: "#2e7d32", fontWeight: "bold", marginTop: "10px" }}>
                ✅ Visual Recognition complete — {vrSelected.length} objects selected
              </div>
            )}
          </div>
        )}

        {/* ===== SECTION 4: VISUAL PATTERN RECOGNITION ===== */}
        {patternData && (
          <div style={{ background: "#fff3e0", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #ffe0b2" }}>
            <h3 style={{ marginTop: 0, color: "#e65100" }}>4. Pattern Recognition</h3>
            <p style={{ color: "#bf360c", fontSize: "14px", marginBottom: "15px" }}>
              Look at the pattern and select what comes next.
            </p>

            <div style={{
              background: "#fff8e1", padding: "20px", borderRadius: "10px",
              border: "1px solid #ffecb3", textAlign: "center", marginBottom: "20px"
            }}>
              <p style={{ fontSize: "14px", color: "#795548", marginBottom: "12px", fontWeight: "bold" }}>
                {patternData.instruction || "What comes next?"}
              </p>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                {patternData.sequence?.map((item, i) => (
                  <div key={i} style={{
                    fontSize: "36px", padding: "10px 14px",
                    background: "#fff", borderRadius: "10px",
                    border: "2px solid #ffe0b2",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                  }}>
                    {item}
                  </div>
                ))}
                <div style={{
                  fontSize: "36px", padding: "10px 14px",
                  background: "#fff3e0", borderRadius: "10px",
                  border: "3px dashed #ff9800",
                  color: "#ff9800", fontWeight: "bold"
                }}>
                  ?
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {patternData.options && Object.entries(patternData.options).map(([key, value]) => {
                const isActive = selectedPatternAnswer === key;
                return (
                  <button key={key} type="button" onClick={() => setSelectedPatternAnswer(key)}
                    style={selBtnStyle(isActive)}>
                    <span style={{
                      display: "inline-block", width: "30px", height: "30px",
                      borderRadius: "50%", lineHeight: "30px", textAlign: "center",
                      marginRight: "10px", fontSize: "14px",
                      background: isActive ? "rgba(255,255,255,0.3)" : "#fff3e0",
                      color: isActive ? "#fff" : "#e65100", fontWeight: "bold"
                    }}>
                      {key}
                    </span>
                    <span style={{ fontSize: "24px" }}>{value}</span>
                  </button>
                );
              })}
            </div>

            {selectedPatternAnswer && (
              <div style={{ textAlign: "center", marginTop: "12px", color: "#2e7d32", background: "#e8f5e9", padding: "8px", borderRadius: "5px", fontWeight: "bold", fontSize: "14px" }}>
                ✅ Selected: Option {selectedPatternAnswer}
              </div>
            )}
          </div>
        )}

        {/* ===== SECTION 5: DELAYED RECALL ===== */}
        <div style={{ background: "#e2f0d9", padding: "20px", borderRadius: "8px", marginBottom: "30px", border: "1px solid #c3e6cb" }}>
          <h3 style={{ marginTop: 0, color: "#155724" }}>5. Delayed Recall</h3>
          <p style={{ color: "#155724", fontSize: "14px", marginBottom: "10px" }}>
            Earlier in Phase 1, you were asked to remember some words.
            <br /><strong>Instruction:</strong> Now recall and type them from memory.
          </p>
          <input
            type="text"
            placeholder="e.g., word1, word2, word3"
            value={delayedRecall}
            onChange={(e) => setDelayedRecall(e.target.value)}
            disabled={dontRememberDelayedRecall}
            style={{ width: "100%", padding: "12px", fontSize: "16px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #ccc", backgroundColor: dontRememberDelayedRecall ? "#e9ecef" : "white", marginBottom: "15px" }}
          />
          <button
            type="button"
            onClick={() => {
              setDontRememberDelayedRecall(!dontRememberDelayedRecall);
              if (!dontRememberDelayedRecall) setDelayedRecall("");
            }}
            style={{ width: "100%", padding: "16px", borderRadius: "8px", border: dontRememberDelayedRecall ? "2px solid #dc3545" : "2px solid #adb5bd", background: dontRememberDelayedRecall ? "#dc3545" : "#f8f9fa", color: dontRememberDelayedRecall ? "white" : "#495057", fontSize: "18px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}
          >
            I Don't Remember
          </button>
        </div>

        {/* ===== SUBMIT ===== */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
          <button type="submit" disabled={loading}
            style={{
              padding: "15px 40px",
              background: loading ? "#6c757d" : "#2e7d32",
              color: "white", border: "none", borderRadius: "8px",
              fontSize: "18px", fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.3s",
              minWidth: "300px"
            }}>
            {loading ? "Analyzing..." : "Submit Level 2 Assessment"}
          </button>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
            You can submit even if some sections are unanswered — unanswered parts will be scored as 0.
          </p>
        </div>
      </form>
    </div>
  );
}
