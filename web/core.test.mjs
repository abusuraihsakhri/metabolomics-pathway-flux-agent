import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, parseCsv, resultsCsv, parseBoolean } from "./core.mjs";

test("nominal evaluation has no alerts", () => {
  const r = evaluate({task_id:"T1", target_identifier:"K1", primary_metric:12, secondary_metric:4, status_descriptor:"NOMINAL", is_critical_flag:"False"});
  assert.equal(r.overall_urgency, "ROUTINE");
  assert.equal(r.total_alerts, 0);
  assert.equal(r.audit_hash, null);
});
test("thresholds and anomaly descriptor trigger three alerts", () => {
  const r = evaluate({task_id:"T2", target_identifier:"K2", primary_metric:28, secondary_metric:14, status_descriptor:"DISCORDANT", is_critical_flag:false});
  assert.equal(r.overall_urgency, "ELEVATED_RISK");
  assert.equal(r.total_alerts, 3);
});
test("explicit critical flag, including CSV string, elevates urgency", () => {
  const r = evaluate({task_id:"T3", target_identifier:"K3", primary_metric:1, secondary_metric:1, is_critical_flag:"True"});
  assert.equal(r.overall_urgency, "CRITICAL_STAT_PANIC");
  assert.equal(r.total_alerts, 1);
});
test("false boolean strings are not true", () => {
  assert.equal(parseBoolean("False"), false);
  assert.equal(parseBoolean("0"), false);
  assert.equal(parseBoolean("Yes"), true);
  assert.throws(() => parseBoolean("maybe"), /Invalid/);
});
test("numeric and required-field validation", () => {
  assert.throws(() => evaluate({task_id:"T1", target_identifier:"K1", primary_metric:"NaN"}), /finite/);
  assert.throws(() => evaluate({task_id:"", target_identifier:"K1", primary_metric:2}), /required/);
  assert.throws(() => evaluate({task_id:"T1", target_identifier:"K1", primary_metric:""}), /supplied/);
});
test("CSV handles BOM, CRLF and quoted comma", () => {
  const rows = parseCsv('\uFEFFtask_id,target_identifier,primary_metric,status_descriptor\r\n"Task, 1",K1,2,"NOMINAL"\r\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].task_id, "Task, 1");
  assert.equal(evaluate(rows[0]).overall_urgency, "ROUTINE");
});
test("CSV errors show malformed data", () => {
  assert.throws(() => parseCsv("task_id,target_identifier,primary_metric\nX,Y"), /wrong number/);
  assert.throws(() => parseCsv("task_id,target_identifier,primary_metric\n\"oops,Y,2"), /unterminated/);
});
test("export is parseable and includes the evaluated status", () => {
  const r = evaluate({task_id:"T,4", target_identifier:"K4", primary_metric:31, is_critical_flag:false});
  const csv = resultsCsv([r]);
  const out = parseCsv(csv);
  assert.equal(out[0].task_id, "T,4");
  assert.equal(out[0].overall_urgency, "ELEVATED_RISK");
});
