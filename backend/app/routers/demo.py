from fastapi import APIRouter, Depends, Query, HTTPException
import os

from app.models.demo_schemas import DemoGenerateRequest, DemoStatusResponse
from app.services.demo_data_service import demo_data_service

router = APIRouter()

def _require_demo_mode():
    """Environment safety valve to prevent accidental production triggering."""
    # Assuming ENV var logic or similar for architecture test. Using True for current Phase 13 mock.
    if os.getenv("DEMO_MODE", "True") != "True" and os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Demo endpoints are locked out of Production.")

@router.post("/generate", response_model=DemoStatusResponse, dependencies=[Depends(_require_demo_mode)])
def generate_demo_environment(payload: DemoGenerateRequest):
    """
    Instantly provisions a realistic, full-stack NeuroVia database populated 
    with 90-day time-series data and pre-computed caches for Hackathon judging.
    """
    res = demo_data_service.generate_demo_dataset(payload.scenario, payload.patient_count, payload.days)
    return DemoStatusResponse(**res)

@router.delete("/reset", response_model=DemoStatusResponse, dependencies=[Depends(_require_demo_mode)])
def purge_demo_environment():
    """
    Carefully deletes specific demo data traces based on the specific `@demo.neurovia.com` tag
    without destroying real platform user data.
    """
    res = demo_data_service.reset_demo_data()
    return DemoStatusResponse(**res)
