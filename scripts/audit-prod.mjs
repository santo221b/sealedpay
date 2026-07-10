#!/usr/bin/env node
/**
 * Allowlist-aware production audit gate (supply-chain layer 3; SECURITY.md).
 *
 * `npm audit --omit=dev` cannot be trusted alone in an npm-workspaces repo:
 * npm does not apply dev flags to workspace devDependencies, so dev-only
 * tooling (e.g. hardhat-deploy's pinned axios 0.x) blocks the gate with
 * advisories that can never reach production. This runner recomputes TRUE
 * production reachability from package-lock.json — root + workspace prod
 * dependency edges, resolved node-style through nested node_modules — and
 * fails only when a high/critical advisory touches a prod-reachable node.
 *
 * GHSA_ALLOWLIST is for documented false positives: every entry must have a
 * matching paragraph in SECURITY.md's audit history explaining why the CVE
 * cannot hit users. No paragraph, no allowlisting.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const GHSA_ALLOWLIST = new Set([]);
const GATE = new Set(["high", "critical"]);

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const pkgs = lock.packages ?? {};

/** Resolve dependency `name` from the package at `fromPath`, the way node does. */
function resolveDep(fromPath, name) {
  let base = fromPath;
  for (;;) {
    const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
    if (pkgs[candidate]) return candidate;
    if (!base) return null;
    const idx = base.lastIndexOf("/node_modules/");
    base = idx === -1 ? "" : base.slice(0, idx);
  }
}

/** Follow workspace link entries to the real package entry. */
function deref(path) {
  const entry = pkgs[path];
  return entry?.link && entry.resolved && pkgs[entry.resolved] ? entry.resolved : path;
}

// BFS over PROD dependency edges from the root and every workspace. Peer
// edges count too: an installed peer is loadable at runtime, so it is part
// of the production attack surface (resolveDep returns null for uninstalled
// optional peers, which skips them naturally).
const prodReachable = new Set();
const queue = [];
for (const [path, entry] of Object.entries(pkgs)) {
  if (path.includes("node_modules")) continue; // root ("") + true workspace roots only
  for (const name of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies, ...entry.peerDependencies })) {
    const dep = resolveDep(path, name);
    if (dep) queue.push(dep);
  }
}
while (queue.length) {
  const raw = queue.pop();
  const path = deref(raw);
  if (prodReachable.has(path)) continue;
  prodReachable.add(raw); // audit may report the link path itself
  prodReachable.add(path);
  const entry = pkgs[path];
  for (const name of Object.keys({ ...entry?.dependencies, ...entry?.optionalDependencies, ...entry?.peerDependencies })) {
    const dep = resolveDep(path, name);
    if (dep) queue.push(dep);
  }
}

const res = spawnSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
// Fail CLOSED: a gate that cannot audit must block, not wave through.
if (res.error) {
  console.error(`audit:prod ERROR — could not run npm: ${res.error.message}`);
  process.exit(1);
}
let audit;
try {
  audit = JSON.parse(res.stdout || "{}");
} catch {
  audit = {};
}
// npm audit exits 1 WITH a vulnerabilities key when vulns exist — that is
// normal and proceeds. Error-shaped or keyless output blocks the gate.
if (audit.error || !audit.vulnerabilities) {
  console.error(`audit:prod ERROR — npm audit did not produce a vulnerability report: ${audit.error?.summary ?? audit.message ?? "no vulnerabilities key"}`);
  process.exit(1);
}

const failing = [];
const skippedDevOnly = [];
const skippedAllowlisted = [];
for (const [name, vuln] of Object.entries(audit.vulnerabilities ?? {})) {
  if (!GATE.has(vuln.severity)) continue;
  const advisories = (vuln.via ?? []).filter((v) => typeof v === "object");
  const ghsas = advisories.map((a) => (a.url ?? "").split("/").pop()).filter(Boolean);
  if (ghsas.length > 0 && ghsas.every((g) => GHSA_ALLOWLIST.has(g))) {
    skippedAllowlisted.push({ name, ghsas });
    continue;
  }
  const nodes = vuln.nodes ?? [];
  // Conservative: no node paths reported → assume prod-reachable.
  const prodNodes = nodes.length === 0 ? ["(unknown node)"] : nodes.filter((n) => prodReachable.has(n));
  if (prodNodes.length > 0) failing.push({ name, severity: vuln.severity, prodNodes, ghsas });
  else skippedDevOnly.push({ name, severity: vuln.severity, nodes });
}

for (const s of skippedAllowlisted) console.log(`allowlisted  ${s.name}  (${s.ghsas.join(", ")}) — documented in SECURITY.md`);
for (const s of skippedDevOnly) console.log(`dev-only     ${s.severity.padEnd(8)} ${s.name}  ${s.nodes.join(", ")}`);
if (failing.length === 0) {
  console.log(`audit:prod PASS — no prod-reachable high/critical advisories (${prodReachable.size} prod nodes checked)`);
  process.exit(0);
}
console.error("\naudit:prod FAIL — prod-reachable high/critical advisories:");
for (const f of failing) console.error(`  ${f.severity.toUpperCase().padEnd(8)} ${f.name}  at ${f.prodNodes.join(", ")}  (${f.ghsas.join(", ")})`);
console.error("\nFix upstream, use overrides, or allowlist the GHSA with a SECURITY.md paragraph (see scripts/audit-prod.mjs header).");
process.exit(1);
