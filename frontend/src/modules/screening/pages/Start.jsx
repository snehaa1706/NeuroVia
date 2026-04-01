import { useState } from 'react';
import { startAssessment } from '../api/screeningApi';

export default function Start({ onNext }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const data = await startAssessment();
      localStorage.setItem("screening_assessmentId", data.assessment_id);
      onNext(data.assessment_id, data.level1_context);
    } catch (err) {
      alert("Error starting test: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Cognitive Screening Test</h2>
      <p>Click below to initialize the test via the Backend API.</p>
      <button 
        onClick={handleStart} 
        disabled={loading}
        style={{ padding: "15px 30px", fontSize: "18px", background: "#28A745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
        {loading ? "Connecting..." : "Start Screening"}
      </button>
    </div>
  );
}
