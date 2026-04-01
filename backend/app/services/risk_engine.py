def determine_risk(cognitive_score: float) -> dict:
    """
    Deterministically maps a final normalized cognitive score to a risk band.
    Purity: No database or external dependencies.
    """
    # Defensive clamp
    cognitive_score = max(0.0, min(cognitive_score, 1.0))
    
    # Invert to generate risk
    risk_score = 1.0 - cognitive_score

    if risk_score <= 0.25:
        band = "low"
        rec = "Monitor annually and maintain healthy habits."
    elif risk_score <= 0.60:
        band = "moderate"
        rec = "Re-test in 3-6 months. Consult a physician."
    else:
        band = "high"
        rec = "Consult a neurologist immediately for a formal evaluation."

    return {
        "risk_score": round(risk_score, 4),
        "risk_band": band,
        "recommendation": rec
    }
