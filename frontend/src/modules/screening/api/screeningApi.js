const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("neurovia_token") || "dummy_dev_token";

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "API Error");
  }

  return res.json();
}

export const startAssessment = async () => {
  return await apiFetch('/screening/start', { method: "POST" });
};

export const submitLevel1 = async (assessmentId, data) => {
  return await apiFetch(`/screening/${assessmentId}/level1`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const submitLevel2 = async (assessmentId, data) => {
  return await apiFetch(`/screening/${assessmentId}/level2`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const submitLevel3 = async (assessmentId, data) => {
  return await apiFetch(`/screening/${assessmentId}/level3`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getResult = async (assessmentId) => {
  return await apiFetch(`/screening/result/${assessmentId}`);
};

export const resumeAssessment = async () => {
  return await apiFetch('/screening/resume');
};

export const transcribeAudio = async (blob) => {
  const token = localStorage.getItem("neurovia_token") || "dummy_dev_token";

  const formData = new FormData();
  // Backend relies on 'audio: UploadFile' field in '/audio/transcribe'
  formData.append("audio", blob, "recording.webm");

  const res = await fetch(`${BASE_URL}/audio/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type manually for FormData
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Transcription failed");

  return res.json();
};
