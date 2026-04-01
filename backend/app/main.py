from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import auth, screening, ai, caregiver, doctor, activities, medications, alerts, transcribe

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="NeuroVia API",
    description="AI-Driven Dementia Screening & Caregiver Support Platform",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(screening.router, prefix="/screening", tags=["Screening"])
app.include_router(ai.router, prefix="/ai", tags=["AI Analysis"])
app.include_router(caregiver.router, prefix="/caregiver", tags=["Caregiver"])
app.include_router(doctor.router, prefix="/doctors", tags=["Doctors"])
app.include_router(activities.router, prefix="/activities", tags=["Activities"])
app.include_router(medications.router, prefix="/medications", tags=["Medications"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(transcribe.router, prefix="/audio", tags=["Audio Transcription"])


@app.get("/")
async def root():
    return {
        "name": "NeuroVia API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
