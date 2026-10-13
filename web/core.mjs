// Browser-only counterpart of the three deterministic worker thresholds in agents/workers.py.
// This is a rule-based prototype; it is not flux balance analysis.
const FLAGS = ["DISCORDANT", "ANOMALY", "MUTANT", "VIOLATION", "FAIL", "REJECT"];

export function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "t"].includes(text)) return true;
  if (["false", "0", "no", "n", "f", ""].includes(text)) return false;
  throw new Error("Invalid critical flag: use true/false, 1/0 or yes/no.");
}

export function evaluate(raw) {
  const taskId = String(raw.task_id ?? "").trim();
  const targetId = String(raw.target_identifier ?? "").trim();
  const descriptor = String(raw.status_descriptor ?? "NOMINAL").trim() || "NOMINAL";
  if (!taskId || !targetId) throw new Error("Task ID and target identifier are required.");
  if (taskId.length > 120 || targetId.length > 120 || descriptor.length > 120) {
    throw new Error("Identifiers and descriptor must be 120 characters or fewer.");
  }
  const rawPrimary = String(raw.primary_metric ?? "").trim();
  const rawSecondary = String(raw.secondary_metric ?? "0").trim();
  if (!rawPrimary || !rawSecondary) throw new Error("Both measurements must be supplied.");
  const primary = Number(rawPrimary);
  const secondary = Number(rawSecondary);
  if (!Number.isFinite(primary) || !Number.isFinite(secondary)) {
    throw new Error("Measurements must be finite numbers.");
  }
  const critical = parseBoolean(raw.is_critical_flag);
  const alerts = [];
  if (primary > 25) alerts.push({
    worker: "InvariantQCWorker", urgency: "ELEVATED_RISK",
    summary: "Primary metric above prototype threshold",
    details: "Primary measurement " + primary + " exceeds 25.0."
  });
  if (critical || secondary > 12) alerts.push({
    worker: "SafetyEscalationWorker",
    urgency: critical ? "CRITICAL_STAT_PANIC" : "ELEVATED_RISK",
    summary: "Critical flag or secondary threshold triggered",
    details: "Critical flag: " + critical + "; secondary measurement: " + secondary + " (threshold 12.0)."
  });
  if (FLAGS.some(flag => descriptor.toUpperCase().includes(flag))) alerts.push({
    worker: "ProtocolConformanceWorker", urgency: "ELEVATED_RISK",
    summary: "Descriptor contains a configured anomaly keyword",
    details: "Matching descriptor: " + descriptor
  });
  const urgent = alerts.some(item => item.urgency === "CRITICAL_STAT_PANIC");
  const overall = urgent ? "CRITICAL_STAT_PANIC" : alerts.length ? "ELEVATED_RISK" : "ROUTINE";
  return {
    task_id: taskId,
    target_identifier: targetId,
    primary_metric: primary,
    secondary_metric: secondary,
    status_descriptor: descriptor,
    is_critical_flag: critical,
    overall_urgency: overall,
    integrity_status: urgent ? "RECALIBRATION_REQUIRED" : alerts.length ? "DISCORDANT_ANOMALY" : "VALIDATED_OPTIMAL",
    total_alerts: alerts.length,
    alerts,
    evaluation_mode: "LOCAL_RULES_ONLY",
    audit_hash: null
  };
}

export const HEADERS = ["task_id", "target_identifier", "primary_metric", "secondary_metric", "is_critical_flag", "status_descriptor"];

export function parseCsv(csv) {
  if (typeof csv !== "string" || !csv.trim()) throw new Error("The CSV file is empty.");
  const rows = [];
  let row = [], cell = "", quoted = false, closed = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else { cell += c; }
    } else if (c === '"' && !cell && !closed) {
      quoted = true;
    } else if (c === ",") {
      row.push(cell); cell = ""; closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = ""; closed = false;
    } else if (closed && c !== " " && c !== "\t") {
      throw new Error("Unexpected text after a closing CSV quote.");
    } else if (!closed) {
      cell += c;
    }
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field.");
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  if (!rows.length) throw new Error("CSV does not contain a header.");
  const headers = rows.shift().map(s => s.replace(/^\uFEFF/, "").trim());
  if (new Set(headers).size !== headers.length) throw new Error("Duplicate CSV header names.");
  for (const header of ["task_id", "target_identifier", "primary_metric"]) {
    if (!headers.includes(header)) throw new Error("Missing required CSV column: " + header);
  }
  if (rows.length > 2000) throw new Error("CSV limit is 2,000 records.");
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error("CSV row " + (i + 2) + " has the wrong number of columns.");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function escapeCsv(value) {
  const str = String(value ?? "");
  return /[,"\r\n]/.test(str) ? '"' + str.replaceAll('"', '""') + '"' : str;
}

export function resultsCsv(results) {
  const columns = [...HEADERS, "overall_urgency", "integrity_status", "total_alerts"];
  const lines = [columns.join(",")];
  for (const r of results) lines.push(columns.map(key => escapeCsv(r[key])).join(","));
  return lines.join("\r\n") + "\r\n";
}
