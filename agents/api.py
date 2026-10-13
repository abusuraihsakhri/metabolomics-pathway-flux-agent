"""
FastAPI REST API Server for Metabolomics Pathway Flux Agent.
"""
import os
import hmac
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from .base import AuditLogger, PHIGuard, SecurityException
from .models import SystemTaskPayload, ConsensusDossier
from .supervisor import SystemSupervisor

supervisor = SystemSupervisor(model_provider="mock")

app = FastAPI(
    title="Metabolomics Pathway Flux Agent API",
    description="Deterministic measurement-rule evaluation prototype; not clinically validated",
    version="2.0.0",
)


class ChatRequest(BaseModel):
    query: str


@app.get("/health")
def health():
    return {"status": "HEALTHY", "service": "metabolomics-pathway-flux-agent", "domain": "Clinical & Biomedical AI", "standard": "illustrative prototype thresholds", "version": "2.0.0"}


@app.get("/metrics")
def metrics():
    return {
        "dossiers_processed_total": len(supervisor.dossier_registry),
        "audit_blocks_total": len(AuditLogger.get_trail()),
        "system_status": "RUNNING"
    }


@app.post("/api/audit")
def api_audit(payload: SystemTaskPayload):
    try:
        dossier = supervisor.process_task(payload)
    except SecurityException:
        raise HTTPException(status_code=422, detail="Potential sensitive identifier detected; use de-identified input.") from None
    return dossier.to_dict()


@app.post("/api/chat")
def api_chat(req: ChatRequest):
    try:
        ans = supervisor.query_supervisory_chat(req.query)
        return {"response": ans}
    except SecurityException:
        raise HTTPException(status_code=422, detail="Potential sensitive identifier detected; use de-identified input.") from None


@app.get("/api/audit/logs")
def api_audit_logs(authorization: str | None = Header(default=None)):
    """Administrative endpoint; disabled until an access token is configured."""
    token = os.environ.get("AUDIT_LOG_READ_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="Audit log access is disabled.")
    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix) or not hmac.compare_digest(authorization[len(prefix):], token):
        raise HTTPException(status_code=401, detail="Unauthorized.", headers={"WWW-Authenticate": "Bearer"})
    return {"audit_trail": AuditLogger.get_trail(), "verified": AuditLogger.verify_integrity()}
