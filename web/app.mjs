import { evaluate, parseCsv, resultsCsv } from "./core.mjs";

const el = id => document.getElementById(id);
let processed = 0;
let lastResults = [];
const output = el("resultJson");
const message = el("message");

function announce(text, isError = false) {
  message.textContent = text;
  message.dataset.kind = isError ? "error" : "ok";
}
function report(result) {
  output.textContent = JSON.stringify(result, null, 2);
  el("status").textContent = result.overall_urgency;
  el("status").dataset.level = result.overall_urgency;
  processed++;
  el("processed").textContent = String(processed);
  el("alerts").textContent = String(result.total_alerts);
}
el("auditForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.is_critical_flag = el("critical").checked;
  try {
    const result = evaluate(data);
    lastResults = [result];
    report(result);
    el("download").disabled = false;
    announce("Evaluation completed locally. No server was contacted.");
  } catch (error) {
    announce(error.message, true);
  }
});
const sample = "task_id,target_identifier,primary_metric,secondary_metric,is_critical_flag,status_descriptor\nSAMPLE-1,DEMO-01,28.4,14.2,true,DISCORDANT\nSAMPLE-2,DEMO-02,12,4.1,false,NOMINAL";
el("sample").addEventListener("click", () => {
  try { handleBatch(sample); }
  catch (error) { announce(error.message, true); }
});
el("file").addEventListener("change", async event => {
  const file = event.currentTarget.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) { announce("CSV file must be 1 MB or smaller.", true); return; }
  try { handleBatch(await file.text()); }
  catch (error) { announce(error.message, true); }
});
function handleBatch(csv) {
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error("CSV contains no data rows.");
  // Validate the entire batch before showing any results.
  const results = rows.map((record, index) => {
    try { return evaluate(record); }
    catch (error) { throw new Error("CSV row " + (index + 2) + ": " + error.message); }
  });
  lastResults = results;
  const body = el("batchRows");
  body.replaceChildren();
  for (const r of results.slice(0, 30)) {
    const tr = document.createElement("tr");
    for (const value of [r.task_id, r.overall_urgency, r.total_alerts]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.append(td);
    }
    body.append(tr);
  }
  el("tableWrap").hidden = false;
  el("batchCount").textContent = results.length > 30
    ? "Showing 30 of " + results.length + " evaluated records"
    : "Showing all " + results.length + " evaluated records";
  const criticalCount = results.filter(r => r.overall_urgency === "CRITICAL_STAT_PANIC").length;
  el("batchSummary").textContent = results.length + " records evaluated; " + criticalCount + " critical flags; " + results.reduce((n, r) => n + r.total_alerts, 0) + " rule alerts.";
  report(results[results.length - 1]);
  processed += results.length - 1;
  el("processed").textContent = String(processed);
  el("download").disabled = false;
  announce("Batch processed locally. Export contains all " + results.length + " records.");
}
el("download").addEventListener("click", () => {
  if (!lastResults.length) return;
  const blob = new Blob([resultsCsv(lastResults)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rule-evaluation-results.csv";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
