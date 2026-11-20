# RiskPilot

RiskPilot provides security guidance and a vulnerability workbench. It researches
public CVEs, calculates provisional priority, proposes remediation and flags
missing context. A human must approve the report before final advisory export.

- Security Guide: https://kho24.github.io/RiskPilot/
- Vulnerability Workbench: https://kho24.github.io/RiskPilot/assessment.html

## Current review status

Final candidate recommendation: **SHIP WITH GATES**. The assessment request
schema is corrected and model output passes an advisory-action guard.
Offline tests cover both fixes. Live model trials and dashboard/browser
verification are release gates, followed by owner deployment approval.
See security/AUDIT.md and security/SECURITY-REVIEW.md.

## Prerequisites and clean setup

- Git to clone the repository.
- Node.js 24 or newer for evaluation. Tests use built-in modules only.
- Python 3 for the static preview.
- Chrome or Edge for browser verification. Optional on-device AI additionally
  needs the browser Prompt API and an available local model.
- Live Gemini needs network access, the deployed Cloudflare Worker, real
  Turnstile verification and Google quota for the configured model.

From a terminal:

    git clone https://github.com/Kho24/RiskPilot.git
    cd RiskPilot
    git switch feature/gemini-risk-note
    node --version

Use the exact commit supplied with the submission when available.
No npm install or secret is required for the preview or offline evaluation.

## Run locally

From the repository root, on Windows with Python installed:

    py -m http.server 8080 --bind 127.0.0.1 --directory dist

On macOS/Linux:

    python3 -m http.server 8080 --bind 127.0.0.1 --directory dist

Leave the terminal open and visit http://127.0.0.1:8080/ or
http://127.0.0.1:8080/assessment.html in your desktop browser. Ctrl+C stops
the preview. The navigation links switch between the two pages.

Open Show demos for a fictional example, or enter a CVE for a live read-only
lookup. Leave missing context as Unknown. After the three stages finish,
inspect the draft. Approve enables Download HTML. Reject and Request Revision
block export. A new run clears approval.

Localhost uses the built-in fallback for Gemini. The public bridge is restricted
to the existing public origin. Optional on-device AI depends on browser support.

## Gemini and Cloudflare architecture

GitHub Pages serves dist/. Typed chat goes through the fixed Cloudflare Worker
after Turnstile verification. The Worker checks origin, schema, size,
verification hostname/action and its IP limiter before Google generateContent.
Only the current message is sent for chat. The assessment sends an object
containing CVE ID and numeric score for one live published finding. The bridge
adds verification and the Worker validates the schema before calling Google.
Demo reports skip cloud notes.

Risk scoring, Remediation and Reviewer use the built-in engine. Optional
on-device AI produces local notes using asset/evidence/prior local-stage data.
The cloud Gemini note is not reviewed by these rules. The model has no
callable network, shell, patching or infrastructure tools.

The Worker strengthens advisory-only model instructions and checks generated
text before returning it. The browser bridge checks again, including responses
from an older Worker. Optional local model notes use the same guard. Recognized
claims of unsupported actions are replaced with a truthful advisory statement.
This conservative English-language check is not a general factual verifier:
paraphrases may escape it and benign quoted/conditional text may be replaced.

Required Worker secret/configuration names:

- GEMINI_API_KEY — Cloudflare secret binding.
- TURNSTILE_SECRET_KEY — Cloudflare secret binding.
- GEMINI_MODEL — model configuration in worker/wrangler.toml.
- NOTE_RATE_LIMIT — rate-limiter binding, not a secret.

The public site key and Worker URL are in dist/gemini.js. Private keys belong
in Cloudflare secret storage. Never put them in dist/, Git, browser JavaScript,
evaluation records or committed .dev.vars files. The grader needs no API key.

An owner preparing a separate Worker environment needs Cloudflare account
access, a Google project, a Turnstile site for the permitted hostname and
Wrangler v4.36 or later. Existing paths and allowed-origin checks target the
current public deployment. This review does not deploy or change that setup.

## Run the final evaluation

    node evaluation/run-final.mjs

The runner executes the retained 10 Milestone II cases plus 67 API/security
cases, three times each with fresh page, widget and fixture state. It runs
actual app handlers, Gemini bridge and Worker code against synthetic
Google/source/Turnstile responses and dummy credentials. Results are:

- evaluation/final-results.json — outputs, criteria, failures and source hashes.
- evaluation/final-results.md — metrics, trial table and failure analysis.

Exit status 1 means a criterion failed. The earlier 15 failures are preserved
in commit b6cc09e. Current criteria retain those checks and add action-claim
and safe-advice regressions. Offline success does not establish live inference
quality.

evaluation/live-cases.json defines 10 live cases, including edge/adversarial
cases, to run three times each from fresh browser state. evaluation/MANUAL.md
explains setup, evidence and semantic scoring. Those 30 trials remain
manual-required. No deployment secret or paid inference is used offline.

## Run the live Gemini evaluation

The semi-automated runner uses the real public frontend, Cloudflare Worker and
fresh Turnstile verification. Optional browser tooling is separate from the
application:

    node evaluation/run-live.mjs --check
    npm --prefix evaluation/browser install --ignore-scripts --package-lock=false
    node evaluation/run-live.mjs --run --worker-version YOUR_VERIFIED_VERSION_UUID
    node evaluation/run-live.mjs --review

On Windows PowerShell use npm.cmd. Verify the active Worker source/config in
Cloudflare before supplying its non-secret version UUID. Keep Chrome visible
and solve genuine challenges. The runner fills cases, captures outputs/status
and tests approval/export automatically. Read remaining semantic criteria
using the grouped review prompt. It never counts fallback or unrun trials as
successful live Gemini tests.

The public frontend must match the committed source. Current local commits
must first become available through the owner's approved release process;
the runner does not publish them. A check failure stops execution without
inference requests. Preparing the plan and unit checks needs no Playwright:

    node evaluation/run-live.mjs --prepare
    node --test evaluation/live-support.test.mjs

See evaluation/LIVE.md and the reduced evaluation/MANUAL.md. Live results are
saved separately in evaluation/live-results.json and live-results.md.

Provisional formulas awaiting instructor confirmation:

- pass@1 = cases passing their first trial / cases in that cohort.
- pass^3 = cases passing all three trials / cases in that cohort.
- A cohort with pending trials has null/unverified metrics. Pending trials
  never count as passes. Offline and live metrics appear side by side.

Other checks:

    node evaluation/run.mjs
    node evaluation/run.mjs --smoke
    node evaluation/probe-public.mjs
    node evaluation/scan-secrets.mjs

The first two retain the Milestone II evaluation. The probe performs five
read-only HTTP checks, writes network-results.json and never invokes inference.
The secret scan prints counts only and writes security/secret-scan.json
without matched values. Both document their limits.

## Safety, privacy and limitations

The queue allows five findings. Research has at most three HTTP attempts per
finding, each with an eight-second timeout. Worker bodies are limited to 4 KiB,
chat to 300 characters, model output to 512 tokens, and returned text to
1,600/600 characters for chat/notes. Gemini has a 25-second Worker deadline
and 40-second browser deadline. The configured IP limit is approximately
five requests/minute per Cloudflare location, not a strict global budget.

Pasted chat goes to Google without automatic sensitive-data redaction.
Conversation, report and approval are held in page memory. Downloads persist
as files. Provider/browser retention needs owner review. Form CSP blocks native
submission, and forms require JavaScript. Approval gates export, not model calls.

Priority is a project heuristic. The app cannot inspect installed assets or
perform scans, patches, shell commands, emails, payments or system changes.
Source outages, model errors, unsafe persuasion and unsupported claims remain
possible. See security/AUDIT.md and security/LIMITATIONS.md.

## Deployment

.github/workflows/pages.yml publishes only dist/ on main pushes or manual
workflow dispatch. Worker deployment is separate. Evaluation/security files
are excluded from the Pages artifact. This preparation does not authorize
merging, deploying or changing secrets.
