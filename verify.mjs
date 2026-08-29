#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === ".git" || e === "tools") continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs)$/.test(e)) files.push(p);
  }
})(ROOT);

let failed = 0;
console.log(`parse-checking ${files.length} modules…`);
for (const f of files) {
  const r = spawnSync(
    process.execPath,
    ["--check", "--input-type=module"],
    { stdio: "pipe", input: readFileSync(f) }
  );
  if (r.status !== 0) {
    failed++;
    console.log(`PARSE FAIL: ${relative(ROOT, f)}`);
    console.log(String(r.stderr).split("\n").slice(0, 4).join("\n"));
  }
}
if (failed) {
  console.error(`${failed} module(s) failed to parse — aborting.`);
  process.exit(1);
}
console.log("all modules parse OK");

const tests = readdirSync(join(ROOT, "js", "tests"))
  .filter((f) => f.endsWith(".test.mjs"))
  .sort();
const failures = [];
for (const t of tests) {
  const r = spawnSync(process.execPath, [join(ROOT, "js", "tests", t)], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    failures.push(t);
    console.error(`TEST FAIL: ${t} — continuing (aggregate report at end).`);
  }
}
if (failures.length) {
  console.error(`\n${failures.length}/${tests.length} test file(s) failed:`);
  for (const t of failures) console.error(`  - ${t}`);
  process.exit(1);
}
console.log(`${tests.length} test files passed.`);
