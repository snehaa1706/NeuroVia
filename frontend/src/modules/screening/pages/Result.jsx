export default function Result({ resultData, onReset }) {
  if (!resultData) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>No Result Found</h2>
        <button onClick={onReset}>Back to Start</button>
      </div>
    );
  }

  const {
    cognitive_score,
    risk_score,
    risk_band,
    clinical_recommendation,
    ai_explanation,
    ai_recommendation,
    ai_confidence
  } = resultData;

  const getColor = (band) => {
    if(band === "low") return "green";
    if(band === "moderate") return "orange";
    return "red";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>Screening Complete</h2>
      
      <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 0" }}>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", width: "30%", textAlign: "center" }}>
          <h3 style={{ margin: 0 }}>Score</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>{(cognitive_score * 100).toFixed(1)}%</p>
        </div>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", width: "30%", textAlign: "center" }}>
          <h3 style={{ margin: 0 }}>Risk</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>{(risk_score * 100).toFixed(1)}%</p>
        </div>
        <div style={{ background: getColor(risk_band), color: "white", padding: "15px", borderRadius: "8px", width: "30%", textAlign: "center" }}>
          <h3 style={{ margin: 0 }}>Band</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", textTransform: "capitalize" }}>{risk_band}</p>
        </div>
      </div>

      <div style={{ background: "#e9ecef", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <h4>Clinical Baseline (Deterministic)</h4>
        <p>{clinical_recommendation}</p>
      </div>

      {(ai_explanation || ai_recommendation) &&(
        <div style={{ border: "1px solid #007BFF", borderLeft: "5px solid #007BFF", padding: "15px", borderRadius: "8px" }}>
          <h4>🤖 AI Neural Summary (Confidence: {ai_confidence?.toUpperCase()})</h4>
          <p><strong>Explanation:</strong> {ai_explanation}</p>
          <p><strong>Recommended Next Step:</strong> {ai_recommendation}</p>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <button onClick={() => {
          localStorage.removeItem('screening_assessmentId');
          onReset();
        }} style={{ padding: "10px 20px", cursor: "pointer" }}>Start New Patient</button>
      </div>
    </div>
  );
}
