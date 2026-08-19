"""
Extended app.py — adds /cases (POST), /evidence (GET/POST) endpoints
to the existing assignment API so Cases & Evidence pages are fully functional.
"""

from __future__ import annotations

import json
import os
import pickle
import uuid
from pathlib import Path
from typing import Optional, List
import datetime

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "scikit-learn"])
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler

from data import OFFICERS, PENDING_CASES, get_distance, specialization_match_score
from train import compute_true_score, extract_features, train

SCRIPT_DIR = Path(__file__).parent
MODEL_DIR  = SCRIPT_DIR / "model"

# ── in-memory stores ───────────────────────────────────────────────────────────
_model:  Optional[GradientBoostingRegressor] = None
_scaler: Optional[StandardScaler]            = None
_meta:   dict                                = {}

# Mutable case list (starts from PENDING_CASES, can grow)
_cases: list = []

# Evidence store: list of dicts
_evidence: list = []

# Assignments: case_id -> assignment dict
_assignments: dict[str, dict] = {}

# Officer caseload overlay
_caseload_overlay: dict[str, int] = {}

# ── seed evidence ──────────────────────────────────────────────────────────────
SEED_EVIDENCE = [
    {
        "id": "EV-MH-001", "case_id": "CASE-MH-2024-001",
        "type": "Digital Evidence", "description": "Cloned card dump from ATM machine logs",
        "uploaded_by": "Rajesh Kumar Sharma", "uploaded_date": "2024-08-01",
        "status": "Analyzed", "analysis_result": "Match Found", "confidence": 97.4,
        "file_name": "atm_logs.bin", "location": "Mumbai"
    },
    {
        "id": "EV-MH-002", "case_id": "CASE-MH-2024-001",
        "type": "CCTV Footage", "description": "ATM camera footage showing suspect",
        "uploaded_by": "Priya Venkataraman", "uploaded_date": "2024-08-01",
        "status": "Analyzed", "analysis_result": "Processing", "confidence": 72.1,
        "file_name": "atm_cam_01.mp4", "location": "Mumbai"
    },
    {
        "id": "EV-DL-001", "case_id": "CASE-DL-2024-002",
        "type": "Document Forgery", "description": "Forged vehicle registration papers",
        "uploaded_by": "Ravi Shankar Gupta", "uploaded_date": "2024-08-03",
        "status": "Analyzing", "analysis_result": "In Progress", "confidence": 55.0,
        "file_name": "reg_papers.pdf", "location": "Delhi"
    },
    {
        "id": "EV-DL-002", "case_id": "CASE-DL-2024-002",
        "type": "Fingerprint", "description": "Latent prints from steering wheel",
        "uploaded_by": "Fatima Sheikh", "uploaded_date": "2024-08-03",
        "status": "Analyzed", "analysis_result": "Match Found", "confidence": 99.1,
        "file_name": "fingerprint_scan.jpg", "location": "Delhi"
    },
    {
        "id": "EV-KA-001", "case_id": "CASE-KA-2024-003",
        "type": "Network Forensics", "description": "Server access logs from breached system",
        "uploaded_by": "Harpreet Singh Bedi", "uploaded_date": "2024-08-05",
        "status": "Analyzing", "analysis_result": "In Progress", "confidence": 41.3,
        "file_name": "server_logs.tar.gz", "location": "Bangalore"
    },
    {
        "id": "EV-TN-001", "case_id": "CASE-TN-2024-004",
        "type": "Toxicology", "description": "Blood and tissue samples from deceased",
        "uploaded_by": "Anjali Deshmukh", "uploaded_date": "2024-08-06",
        "status": "Analyzing", "analysis_result": "In Progress", "confidence": 30.0,
        "file_name": "toxicology_report.pdf", "location": "Chennai"
    },
    {
        "id": "EV-TN-002", "case_id": "CASE-TN-2024-004",
        "type": "DNA", "description": "Hair samples from crime scene",
        "uploaded_by": "Arun Singh Chauhan", "uploaded_date": "2024-08-06",
        "status": "Pending Analysis", "analysis_result": "Pending", "confidence": 0,
        "file_name": "dna_sample_001.zip", "location": "Chennai"
    },
    {
        "id": "EV-TS-001", "case_id": "CASE-TS-2024-005",
        "type": "Fingerprint", "description": "Multiple latent prints from showroom counter",
        "uploaded_by": "Rajesh Kumar Sharma", "uploaded_date": "2024-08-07",
        "status": "Analyzed", "analysis_result": "Match Found", "confidence": 96.8,
        "file_name": "showroom_prints.jpg", "location": "Hyderabad"
    },
    {
        "id": "EV-UP-001", "case_id": "CASE-UP-2024-006",
        "type": "Ballistics", "description": "7 recovered firearms, ballistics analysis pending",
        "uploaded_by": "Mohammed Khalid Ansari", "uploaded_date": "2024-08-08",
        "status": "Pending Analysis", "analysis_result": "Pending", "confidence": 0,
        "file_name": "ballistics_report.pdf", "location": "Lucknow"
    },
    {
        "id": "EV-WB-001", "case_id": "CASE-WB-2024-009",
        "type": "DNA", "description": "DNA evidence collected from crime scene",
        "uploaded_by": "Arun Singh Chauhan", "uploaded_date": "2024-08-10",
        "status": "Analyzed", "analysis_result": "Match Found", "confidence": 98.9,
        "file_name": "dna_evidence.zip", "location": "Kolkata"
    },
]

# ── lifespan ───────────────────────────────────────────────────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model, _scaler, _meta, _cases, _evidence
    model_path  = MODEL_DIR / "gb_model.pkl"
    scaler_path = MODEL_DIR / "scaler.pkl"
    meta_path   = MODEL_DIR / "model_meta.json"

    if not model_path.exists():
        print("[INFO] Model not found - training now...")
        _model, _scaler, _meta = train()
    else:
        print("[INFO] Loading pre-trained model...")
        with open(model_path, "rb") as f:
            _model = pickle.load(f)
        with open(scaler_path, "rb") as f:
            _scaler = pickle.load(f)
        with open(meta_path) as f:
            _meta = json.load(f)

    # seed data
    _cases = [dict(c) for c in PENDING_CASES]
    _evidence = [dict(e) for e in SEED_EVIDENCE]
    print("[INFO] Assignment service ready - OK")
    yield

app = FastAPI(title="ForensicAI - Smart Case Assignment API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── helpers ────────────────────────────────────────────────────────────────────

def get_officer_effective_caseload(officer_id: str, base_caseload: int) -> int:
    return base_caseload + _caseload_overlay.get(officer_id, 0)

def score_officer_for_case(officer: dict, case: dict) -> dict:
    effective_officer = dict(officer)
    effective_officer["caseload"] = get_officer_effective_caseload(officer["id"], officer["caseload"])
    features = extract_features(effective_officer, case)
    X = np.array([features])
    X_scaled = _scaler.transform(X)
    try:
        ml_score = float(np.clip(_model.predict(X_scaled)[0], 0, 100))
    except Exception:
        ml_score = compute_true_score(effective_officer, case)
    spec_score    = specialization_match_score(officer["skills"], case.get("evidence_types", []))
    free_ratio    = (effective_officer["max_caseload"] - effective_officer["caseload"]) / effective_officer["max_caseload"]
    workload_score = max(0.0, min(100.0, free_ratio * 100))
    dist          = get_distance(officer["location"], case.get("location", ""))
    proximity     = max(0.0, (1 - dist / 3000.0) * 100)
    return {
        "officer_id": officer["id"], "name": officer["name"], "rank": officer["rank"],
        "specialization": officer["specialization"], "location": officer["location"],
        "state": officer["state"], "experience_years": officer["experience_years"],
        "success_rate": officer["success_rate"], "caseload": effective_officer["caseload"],
        "max_caseload": officer["max_caseload"], "match_score": round(ml_score, 1),
        "already_assigned": any(
            a["case_id"] == case["id"] and a["officer_id"] == officer["id"] and a["status"] == "Active"
            for a in _assignments.values()
        ),
        "factors": {
            "specialization_match": round(spec_score, 1),
            "workload_available": round(workload_score, 1),
            "success_rate": officer["success_rate"],
            "proximity_score": round(proximity, 1),
            "distance_km": round(dist, 0),
        },
    }

# ── schemas ────────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    case_id: str

class AssignRequest(BaseModel):
    case_id: str
    officer_id: str
    notes: Optional[str] = None

class NewCaseRequest(BaseModel):
    title: str
    crime_type: str
    evidence_types: List[str]
    priority: str
    complexity: str
    location: str
    state: str
    estimated_days: int
    description: str

class NewEvidenceRequest(BaseModel):
    case_id: str
    type: str
    description: str
    uploaded_by: str
    location: str
    file_name: Optional[str] = None

# ── endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok", "model": _meta.get("algorithm", "unknown"),
        "mae": _meta.get("mae"), "r2": _meta.get("r2"),
        "weights": _meta.get("weights", {}),
        "officers": len(OFFICERS), "pending_cases": len(_cases),
    }

@app.get("/officers")
def list_officers():
    result = []
    for o in OFFICERS:
        eff = dict(o)
        eff["caseload"] = get_officer_effective_caseload(o["id"], o["caseload"])
        eff["availability"] = round(((eff["max_caseload"] - eff["caseload"]) / eff["max_caseload"]) * 100, 1)
        result.append(eff)
    return {"success": True, "data": result}

@app.get("/cases")
def list_cases():
    enriched = []
    for c in _cases:
        ec = dict(c)
        assignment = _assignments.get(c["id"])
        ec["assigned"] = assignment is not None and assignment.get("status") == "Active"
        ec["assignment"] = assignment if ec["assigned"] else None
        ec["evidence_count"] = sum(1 for e in _evidence if e["case_id"] == c["id"])
        enriched.append(ec)
    return {"success": True, "data": enriched}

@app.post("/cases")
def create_case(body: NewCaseRequest):
    # Generate an Indian-style case ID
    state_codes = {
        "Maharashtra": "MH", "Delhi": "DL", "Karnataka": "KA", "Tamil Nadu": "TN",
        "Telangana": "TS", "Gujarat": "GJ", "Uttar Pradesh": "UP", "West Bengal": "WB",
        "Rajasthan": "RJ", "Kerala": "KL", "Punjab": "PB", "Bihar": "BR",
        "Madhya Pradesh": "MP", "Andhra Pradesh": "AP", "Haryana": "HR",
    }
    code = state_codes.get(body.state, "IN")
    year = datetime.datetime.now().year
    idx  = len([c for c in _cases if c["id"].startswith(f"CASE-{code}")]) + 1
    new_id = f"CASE-{code}-{year}-{idx:03d}"
    case = {
        "id": new_id, "title": body.title, "crime_type": body.crime_type,
        "evidence_types": body.evidence_types, "priority": body.priority,
        "complexity": body.complexity, "location": body.location,
        "state": body.state, "estimated_days": body.estimated_days,
        "description": body.description,
        "created_date": datetime.datetime.now().strftime("%Y-%m-%d"),
    }
    _cases.append(case)
    return {"success": True, "data": case, "message": f"Case {new_id} created"}

@app.delete("/cases/{case_id}")
def delete_case(case_id: str):
    global _cases
    before = len(_cases)
    _cases = [c for c in _cases if c["id"] != case_id]
    if len(_cases) == before:
        raise HTTPException(404, f"Case {case_id} not found")
    # Remove evidence and assignment too
    return {"success": True, "message": f"Case {case_id} deleted"}

@app.get("/evidence")
def list_evidence(case_id: Optional[str] = None):
    data = _evidence if not case_id else [e for e in _evidence if e["case_id"] == case_id]
    return {"success": True, "data": data}

@app.post("/evidence")
def add_evidence(body: NewEvidenceRequest):
    case = next((c for c in _cases if c["id"] == body.case_id), None)
    if not case:
        raise HTTPException(404, f"Case {body.case_id} not found")
    year = datetime.datetime.now().year
    idx  = len([e for e in _evidence if e["case_id"] == body.case_id]) + 1
    code = body.case_id.split("-")[1] if "-" in body.case_id else "IN"
    ev_id = f"EV-{code}-{year}-{idx:03d}"
    ev = {
        "id": ev_id, "case_id": body.case_id, "type": body.type,
        "description": body.description, "uploaded_by": body.uploaded_by,
        "uploaded_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "location": body.location,
        "status": "Pending Analysis", "analysis_result": "Pending", "confidence": 0,
        "file_name": body.file_name or "uploaded_file",
    }
    _evidence.append(ev)
    return {"success": True, "data": ev, "message": f"Evidence {ev_id} added"}

@app.delete("/evidence/{evidence_id}")
def delete_evidence(evidence_id: str):
    global _evidence
    before = len(_evidence)
    _evidence = [e for e in _evidence if e["id"] != evidence_id]
    if len(_evidence) == before:
        raise HTTPException(404, "Evidence not found")
    return {"success": True, "message": "Evidence deleted"}

@app.post("/recommend")
def recommend(body: RecommendRequest):
    case = next((c for c in _cases if c["id"] == body.case_id), None)
    if not case:
        raise HTTPException(404, f"Case {body.case_id} not found")
    recs = [score_officer_for_case(o, case) for o in OFFICERS if o["active"]]
    recs.sort(key=lambda r: r["match_score"], reverse=True)
    return {"success": True, "case": case, "recommendations": recs}

@app.post("/assign")
def assign(body: AssignRequest):
    case    = next((c for c in _cases if c["id"] == body.case_id), None)
    officer = next((o for o in OFFICERS if o["id"] == body.officer_id), None)
    if not case:    raise HTTPException(404, f"Case {body.case_id} not found")
    if not officer: raise HTTPException(404, f"Officer {body.officer_id} not found")
    existing = _assignments.get(body.case_id)
    if existing and existing.get("status") == "Active":
        _caseload_overlay[existing["officer_id"]] = _caseload_overlay.get(existing["officer_id"], 0) - 1
    score_data = score_officer_for_case(officer, case)
    assignment = {
        "id": f"ASSIGN-{body.case_id}-{body.officer_id}",
        "case_id": body.case_id, "case_title": case["title"],
        "officer_id": body.officer_id, "officer_name": officer["name"],
        "match_score": score_data["match_score"], "notes": body.notes,
        "status": "Active", "assigned_at": datetime.datetime.now().isoformat(),
    }
    _assignments[body.case_id] = assignment
    _caseload_overlay[body.officer_id] = _caseload_overlay.get(body.officer_id, 0) + 1
    return {"success": True, "data": assignment, "message": f"Case assigned to {officer['name']}"}

@app.get("/assignments")
def list_assignments():
    return {"success": True, "data": list(_assignments.values())}

@app.delete("/assignments/{case_id}")
def unassign(case_id: str):
    if case_id not in _assignments or _assignments[case_id].get("status") != "Active":
        raise HTTPException(404, "No active assignment for this case")
    old = _assignments[case_id]
    _caseload_overlay[old["officer_id"]] = _caseload_overlay.get(old["officer_id"], 0) - 1
    _assignments[case_id]["status"] = "Inactive"
    return {"success": True, "message": "Assignment removed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
