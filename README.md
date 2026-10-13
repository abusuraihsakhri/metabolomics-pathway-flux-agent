# Metabolomics Pathway Flux Agent

A research prototype for deterministic evaluation of two numeric measurements, a status descriptor, and a critical flag. The repository contains a Python CLI/API, a standalone browser interface, and a separate legacy "flux_balance" rules module.

**Scientific scope:** Despite the repository name, the implemented code does **not** solve stoichiometric flux balance problems (S·v = 0), infer metabolic fluxes, estimate pathway enrichment, or validate clinical decisions. It applies illustrative fixed thresholds. The module names are historical and should not be interpreted as evidence of FBA support.

## Browser application

The self-contained interface in [web/index.html](web/index.html) runs directly in any recent browser. It supports single-record rule evaluation, CSV batch import and results export. The browser calculations run in JavaScript without a Python server, third-party scripts, or Pyodide. The included root index redirects to the web interface when served from the repository root. A GitHub Pages deployment workflow publishes the contents of web/ when Pages is configured for GitHub Actions.

Inputs remain in the current browser tab and are not transmitted to an API. Exported CSV files are saved only when you request them. **Do not input patient identifiers, confidential data, or protected health information.** The browser does not perform cryptographic audit signing.

### Decision rules

The primary CLI/API and browser rules are:

| Condition | Alert | Urgency |
|---|---|---|
| Primary measurement > 25.0 | InvariantQCWorker | Elevated |
| Secondary measurement > 12.0 | SafetyEscalationWorker | Elevated |
| Critical flag is true | SafetyEscalationWorker | Critical |
| Descriptor includes DISCORDANT, ANOMALY, MUTANT, VIOLATION, FAIL or REJECT | ProtocolConformanceWorker | Elevated |

Any critical alert takes priority; otherwise any alert makes the overall status elevated. These cutoffs are example software rules, **not clinically or biologically validated reference intervals**. The legacy flux_balance module applies similar rules with a secondary threshold of 10.0, rather than an LP solver.

## Python installation

Requires Python 3.10+.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[server,test]"
python -m pytest -q
\`\`\`

Run single- and multi-record evaluations:

\`\`\`bash
python cli.py audit --task-id TASK-001 --target SAMPLE-A --primary 28.5 --secondary 14.2 --status DISCORDANT
python cli.py batch -i sample.csv -o results.csv
python cli.py verify-audit
python -m flux_balance.cli audit
\`\`\`

For CSV batch input, use task_id, target_identifier and primary_metric, with optional secondary_metric, status_descriptor, is_critical_flag. Flags accept true/false, 1/0 and yes/no (case-insensitive). Invalid flags are rejected rather than silently interpreted. The Python CLIs preserve the existing output formats.

## API and container

\`\`\`bash
python cli.py serve --host 127.0.0.1 --port 8000
# or
docker build -t metabolomics-pathway-flux-agent .
docker run --rm -p 127.0.0.1:8000:8000 -e AUDIT_SECRET_KEY="<a-generated-random-secret>" metabolomics-pathway-flux-agent
\`\`\`

Endpoints:

- GET /health: process health metadata
- GET /metrics: counts of dossiers and audit records
- POST /api/audit: evaluate SystemTaskPayload
- POST /api/chat: deterministic mock response (not a live language-model integration)
- GET /api/audit/logs: administrative audit-chain verification; **disabled** unless AUDIT_LOG_READ_TOKEN is configured, then requires \`Authorization: Bearer <token>\`

The in-memory HMAC-SHA256 chain uses AUDIT_SECRET_KEY or a randomly generated **ephemeral** process key; restarts discard the records and an ephemeral key cannot verify past processes. Generate a deployment key with \`python -c "import secrets; print(secrets.token_hex(32))"\`; keep it server-side, outside source control. For Docker Compose, supply AUDIT_SECRET_KEY via a local .env file (not committed). The default container mapping binds to localhost.

The Python input guard checks selected common identifier patterns but is **not** complete PHI de-identification, HIPAA certification, or a guarantee against data leakage. Only submit non-identifiable synthetic or appropriately de-identified research data. Do not expose the backend publicly without separate authentication, rate limiting, encryption in transit and operational controls.

## Development and tests

\`\`\`bash
python -m pytest -q
node --test web/core.test.mjs
python -m compileall -q agents flux_balance cli.py input_parsing.py
\`\`\`

GitHub Actions tests the package and Python code on 3.10, 3.11 and 3.12, plus the browser-side rules on Node.js 22. The static interface is intended for current Chrome, Firefox, Safari and Edge; browser-level end-to-end verification is separate from unit tests.

## Technology and license

Python, Pydantic 2, optional FastAPI/Uvicorn, vanilla HTML/CSS/JavaScript. No backend is required for the browser interface. MIT license: [LICENSE](LICENSE).
