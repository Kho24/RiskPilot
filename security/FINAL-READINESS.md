# Final submission gaps and deployment readiness

Read-only Git inspection at 2026-11-19T18:47:01.156Z. This snapshot precedes any commit of the live-runner preparation.

## Candidate

- Branch: feature/gemini-risk-note
- Inspection HEAD / fixed agent source candidate: f7168f922531646ba1d0dd2ef107db972d0a735a
- Local origin/feature tracking ref: c07e954de49cf43f8ed058f0e6c112d3cdcfaa74
- Local main: 345889ce399b5a63a41c9008f96caa108d1d0793
- Local origin/main tracking ref: 345889ce399b5a63a41c9008f96caa108d1d0793

Remote-tracking refs are local snapshots. They were not refreshed and do not prove current GitHub main or the active Worker version.

Additional committed final-candidate work beyond the local tracked feature baseline:

- f7168f9 Fix Gemini assessment payload and guard unsupported action claims
- b6cc09e Audit RiskPilot security and add final API evaluation

This live-runner preparation is intended final-candidate work and must be included in its feature-branch commit. It changes evaluation/documentation only.

## Files that would deploy

Relative to local origin/feature at c07e954, committed Pages application changes are:

- dist/advisory.js — shared advisory-only instructions and output guard.
- dist/app.js — corrected object payload for the risk-note route.
- dist/engine.js — guard optional on-device output.
- dist/gemini.js — browser-side output guard.

The separate Worker change is worker/index.mjs: advisory-only prompt and output guard. worker/wrangler.toml, secret bindings, model configuration and limits are unchanged.

Pages uploads the entire committed dist/ artifact from main. Evaluation, browser tooling and security drafts remain outside that artifact. The existing GitHub Actions workflow is unchanged.

Earlier Gemini integration commits are already ancestors of this candidate. Local main tracking is stale, so the owner must inspect the actual GitHub PR diff before any later merge.

## Exclude from the final commit/artifact

- Existing uncommitted navigation edits: dist/index.html, dist/assessment.html, dist/style.css.
- Untracked .wrangler/ state and all credential caches or local environment files.
- Optional evaluation/browser/node_modules, browser profiles, cookies, downloaded reports and HAR/screenshots.

Navigation edits were not touched by live-runner preparation. No deploy, merge, push, secret change or inference request was performed. Preflight attempted only read-only public file retrieval.

## Documentation check

- README describes the fixed API architecture, exact local/offline/live commands, optional browser dependency and version gates.
- SECURITY-REVIEW.md describes the corrected system, 77 offline cases, layered guard and SHIP WITH GATES. Owner name and final page formatting remain open.
- LIMITATIONS.md describes fixed historical failures and current semantic, privacy, provider and live-runner limitations.

Offline evidence remains 231/231 with pass@1=100% and pass^3=100%. Live capture currently has 0 executed, 30 pending and unverified metrics.

Recommendation remains **SHIP WITH GATES**. The local fixes are not automatically deployed. The runner requires matching deployed frontend hashes and owner-attested Worker parity before requests.

## Hard requirements

| Requirement | Complete | Evidence/File | Remaining Action |
| --- | --- | --- | --- |
| Complete system runs from clean clone using README | Partial | README.md; evaluation/clean-check.json; evaluation/LIVE.md | Offline clean-folder reruns passed. Publish the approved candidate later, install optional browser tooling, and verify the full real-API path. |
| At least two tools | Yes, implemented | dist/engine.js research and enrichScore; worker/index.mjs | CVE Program lookup and NVD enrichment exist; retain live tool evidence when enrichment is used. Model tool selection is not implemented or claimed. |
| Final evaluation harness updated to current system | Implemented; live execution pending | evaluation/run-final.mjs; run-live.mjs; live-cases.json | Run and review 30 real trials after the version gate passes. |
| One-page manager security review | Draft complete | security/SECURITY-REVIEW.md | Fill owner name and confirm final one-page submission layout. |
| Every untrusted model input named | Yes | security/AUDIT.md section 1 | Confirm deployed source parity. |
| Lethal-trifecta analysis | Yes | security/AUDIT.md section 6 | No content change needed. |
| One specific exfiltration path | Yes | security/AUDIT.md section 6 | Threat scenario is distinguished from a demonstrated live exploit. |
| Removed/gated trifecta leg | Yes | security/AUDIT.md sections 6 and 8 | Private secret access and model-directed communication are restricted; human-mediated disclosure remains possible. |
| Two or three OWASP Agentic categories | Yes | security/AUDIT.md section 7; SECURITY-REVIEW.md | ASI01, ASI08, ASI09 mapped to actual behavior. |
| At least three layered guardrails tied to trifecta legs | Yes | security/AUDIT.md section 8; dist/advisory.js; worker/index.mjs | Verify deployment of the documented controls. |
| Deploy recommendation justified by evidence | Yes, conditional | security/SECURITY-REVIEW.md; evaluation/final-results.md; live-results.md | SHIP WITH GATES; live verification and owner approval are outstanding. |
| Honest limitations | Yes | security/LIMITATIONS.md; evaluation/LIVE.md | Retain pending live inference, Worker attestation and guard limitations. |
| Observed evaluation failures documented | Yes | Baseline b6cc09e; security/LIMITATIONS.md; evaluation/final-results.md | Current offline failures are zero. Live preflight DNS failures and unrun slots are explicitly recorded. |
| What would change with another month | Yes | security/LIMITATIONS.md final section | Proposals remain distinguished from implemented controls. |

## Minimum next human action

Review and confirm an approved way to make the fixed frontend and Worker available for verification. No such deployment is authorized by this task. Then run node evaluation/run-live.mjs --check from a normal terminal. Install browser tooling and start --run only after that gate passes.

Cloudflare identity can only be attested by the owner with dashboard/account access. No API secret is needed by the runner.

## Committed difference from the local tracked feature baseline

The list below excludes all currently uncommitted changes and is not a live GitHub comparison.

- M README.md
- A dist/advisory.js
- M dist/app.js
- M dist/engine.js
- M dist/gemini.js
- A evaluation/MANUAL.md
- A evaluation/advisory-cases.json
- A evaluation/api-fixture.mjs
- A evaluation/chat-workbench.mjs
- A evaluation/clean-check.json
- A evaluation/criteria.mjs
- A evaluation/final-cases.json
- A evaluation/final-results.json
- A evaluation/final-results.md
- A evaluation/live-cases.json
- A evaluation/network-results.json
- A evaluation/probe-public.mjs
- M evaluation/results.json
- A evaluation/run-final.mjs
- M evaluation/run.mjs
- A evaluation/scan-secrets.mjs
- M evaluation/smoke-results.json
- M evaluation/workbench.mjs
- A security/AUDIT.md
- A security/LIMITATIONS.md
- A security/SECURITY-REVIEW.md
- A security/secret-scan.json
- M worker/index.mjs
