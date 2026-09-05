# Metabolomics Pathway Flux Agent

> **Domain:** Clinical Decision Support & Biomedical Computing
> **Reference Guidelines & Standards:** CAP / CLSI / ISO Standards

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB.svg?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?logo=fastapi&logoColor=white)
![Audit Trail](https://img.shields.io/badge/Audit-HMAC--SHA256_Tamper--Evident-brightgreen.svg)
![Zero-PHI Guard](https://img.shields.io/badge/Guard-Zero--PHI_Outbound-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)

</div>

---

## What It Does

**Metabolomics Pathway Flux Agent** is an analytical platform implementing Genome-scale stoichiometric matrix (S*v=0) metabolic Flux Balance Analysis (FBA) with multi-agent consensus evaluation, zero-PHI outbound protection, and tamper-evident HMAC-SHA256 audit trails.

---

## Key Capabilities

- **Deterministic Calculation Engine**: Strict compliance with standard reference formulations and thresholds.
- **Multi-Agent Consensus**: Three specialized workers (QC Invariant, Safety Escalation, Protocol Conformance) evaluate each task.
- **Risk & Urgency Classification**: Multi-tier categorization (ROUTINE, ELEVATED, CRITICAL_STAT) with automated action recommendations.
- **Validation & Guardrails**: Rigorous input bounds checking, NaN/Inf rejection, and anomaly detection.
- **Zero-PHI Outbound Interceptor**: Regex inspection blocking SSNs, MRNs, phone numbers, and patient identifiers.
- **PHI Redaction**: `PHIGuard.redact_phi()` replaces detected PHI with `[REDACTED_IDENTIFIER]`.
- **Tamper-Evident HMAC-SHA256 Audit Trail**: Chained, cryptographically signed logs with full signature verification.
- **FastAPI REST API**: OpenAPI 3.1 REST endpoints with health and audit log access.

---

## Installation

```bash
pip install fastapi uvicorn pydantic pytest
```

---

## CLI Quickstart & Usage

### 1. Single Task Evaluation
```bash
python cli.py audit --task-id TASK-001 --target KEY-01 --primary 28.5 --secondary 14.2 --critical --status DISCORDANT
```

### 2. System Chat Query
```bash
python cli.py chat "What standard is applied?"
```

### 3. Batch CSV Processing
```bash
python cli.py batch -i sample.csv -o results.csv
```

### 4. Verify Audit Trail Integrity
```bash
python cli.py verify-audit
```

### 5. Launch REST API Server
```bash
python cli.py serve --host 127.0.0.1 --port 8000
```

### CLI Parameters
| Parameter | Description | Default |
|:----------|:------------|:--------|
| `--task-id` | Task / case identifier | TASK-2026-001 |
| `--target` | Entity or target identifier | KEY-TARGET-01 |
| `--primary` | Primary metric measurement | 28.5 |
| `--secondary` | Secondary kinetic/confidence score | 14.2 |
| `--critical` | Emergency escalation flag | False |
| `--status` | Status/phenotype descriptor | DISCORDANT |

---

## REST API Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/health` | Health and metadata check |
| GET | `/metrics` | Operational metrics |
| POST | `/api/audit` | Dispatch task payload for evaluation |
| POST | `/api/chat` | Supervisory conversational query |
| GET | `/api/audit/logs` | Retrieve and verify HMAC audit trail |

---

## Input Data Schema

| Field | Type | Description | Requirement |
|:------|:-----|:------------|:------------|
| `task_id` | string | Task / case identifier | Required |
| `target_identifier` | string | Entity or target identifier | Required |
| `primary_metric` | float | Primary measurement (must be finite) | Required |
| `secondary_metric` | float | Secondary kinetic/confidence score | Optional (default: 0.0) |
| `is_critical_flag` | boolean | Emergency escalation trigger | Optional (default: false) |
| `status_descriptor` | string | Status code or phenotype | Optional (default: "NOMINAL") |

---

## Security Architecture

- **Zero-PHI Outbound Interceptor:** Active regex inspection blocking SSNs (`XXX-XX-XXXX`), MRNs (`MRN-XXXXX`), phone numbers, email addresses, DOBs, and common patient name patterns.
- **PHI Redaction:** `PHIGuard.redact_phi()` replaces detected PHI with `[REDACTED_IDENTIFIER]`.
- **Tamper-Evident HMAC-SHA256 Audit Trail:** Each audit entry is signed with HMAC-SHA256 using a secret key. Chain linkage and full signature verification detect any tampering.
- **Secure Secret Management:** The `AUDIT_SECRET_KEY` environment variable controls the HMAC key. If not set, a random ephemeral key is generated with a warning (suitable for testing, not production).
- **Action Executor Auditing:** All audited actions log both success and failure states.

### Setting the Audit Secret

```bash
# Linux/macOS
export AUDIT_SECRET_KEY="your-secure-random-key-here"

# Windows
set AUDIT_SECRET_KEY=your-secure-random-key-here
```

Or via docker-compose with an `.env` file:
```
AUDIT_SECRET_KEY=your-secure-random-key-here
```

---

## Testing

Run the full test suite:
```bash
pytest -v
```

Run with coverage:
```bash
pytest -v --cov=agents --cov=flux_balance
```

Execute high-throughput simulation benchmark:
```bash
python simulator.py 1000
```

---

## Container Deployment

```bash
docker build -t metabolomics-pathway-flux-agent .
docker run -p 8000:8000 -e AUDIT_SECRET_KEY=your-secure-key metabolomics-pathway-flux-agent
```

Or with docker-compose:
```bash
# Create .env file with AUDIT_SECRET_KEY
echo "AUDIT_SECRET_KEY=your-secure-key" > .env
docker-compose up -d
```

---

## Project Structure

```
metabolomics-pathway-flux-agent/
├── agents/                  # Core multi-agent system
│   ├── __init__.py          # Package init
│   ├── api.py               # FastAPI REST server
│   ├── base.py              # Security, PHI guard, HMAC audit trail
│   ├── models.py            # Pydantic schemas and data definitions
│   ├── supervisor.py        # Supervisor orchestrator
│   ├── workers.py           # Specialized worker agents
│   └── llm_factory.py       # LLM provider factory
├── flux_balance/            # Flux Balance Analysis module
│   ├── __init__.py
│   ├── agents.py            # FBA coordinator and sub-agents
│   ├── cli.py               # FBA CLI interface
│   ├── engine.py            # Core algorithmic engine
│   ├── models.py            # FBA data models
│   └── server.py            # FBA FastAPI server
├── tests/                   # Test suite
│   ├── test_metabolomics_pathway_flux_agent.py
│   ├── test_flux_balance.py
│   └── test_enrichment.py
├── web/index.html           # Operations console UI
├── cli.py                   # Main CLI entry point
├── simulator.py             # High-throughput simulation
├── enrichment.py            # Enrichment feature engines
├── sample.csv               # Sample batch input
├── sample_payload.json      # Sample API payload
├── benchmark_dataset.json   # Benchmark test cases
├── pyproject.toml           # Project configuration
├── Dockerfile               # Container build
└── docker-compose.yml       # Compose configuration
```
