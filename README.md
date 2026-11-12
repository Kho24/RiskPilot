# RiskPilot

A browser-based vulnerability assessment and remediation workbench. Serve the dist folder over HTTP, or HTTPS for supported on-device AI. For example, with Python installed, run this command from the project folder and open http://localhost:8080.

    python -m http.server 8080 --directory dist

- Start at the guided chat to learn what a vulnerability is, follow a three-step walkthrough, or open an assessment with a CVE prefilled.
- Open Show demos, then choose Use on Log4Shell, Sweet32, or the PHP filter flaw. Each uses an attributed offline snapshot and editable fictional asset context.
- Enter a CVE manually for a live lookup against the CVE Program public CVE List. The lookup sends the CVE identifier. Asset details stay in the current page.
- Queue up to five findings for a report ordered by provisional risk. A finding with no usable base score stays undetermined.
- Select on-device AI to request supplemental notes from the Risk Analyst, Remediation and Reviewer stages. The app uses the browser Prompt API when a model is installed and available, and falls back to the rules engine otherwise.
- Download the standalone HTML report to retain findings and the execution trace.

The risk formula is a project heuristic and appears in the report. Validate applicability, exposure and remediation decisions with a human analyst.

On the public site, Gemini is enabled by default for typed chat messages and the Risk Analyst note for a single live CVE with a published score. The homepage sends only the current message, and the assessment sends only the CVE ID and score. Cloudflare Turnstile verifies the browser before the Worker sends either payload to Google. Leave private information out of chat. Both screens have a Gemini toggle and fall back to their built-in workflows if Gemini is unavailable.

## Milestone II evaluation

From the repository root, run `node evaluation/run.mjs` with Node.js 24. The runner executes the 10 cases in `evaluation/cases.json` three times each with a fresh app instance and fresh test state. It writes `evaluation/results.json` and `evaluation/results.md` and exits with status 1 if any trial fails.

For a quick check, run `node evaluation/run.mjs --smoke`. This executes four selected cases once each and writes separate `smoke-results.json` and `smoke-results.md` files in the same directory.

The harness exercises the actual assessment form, engine, and approval/export handlers using a simulated DOM and fixed network responses. It checks structured properties such as CVE identity, source state, numeric score and priority, missing fields, request method, and whether an export was produced. The nonexistent-record fixture represents a 404; the published-record fixture is synthetic. The injection case checks rules-mode behavior. Live network reachability, native browser downloads, and on-device AI behavior require separate checks.

Provisional metric definitions pending instructor confirmation

- `pass@1` = number of evaluated cases that pass trial 1 divided by the number of evaluated cases.
- `pass^3` = number of evaluated cases that pass all three trials divided by the number of evaluated cases. Smoke mode leaves this unmeasured.

## GitHub Pages

Push this repository to GitHub on the main branch. In the repository, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**. In **Actions**, run **Deploy RiskPilot to GitHub Pages** if the first push happened before Pages was enabled. Future pushes to main deploy the static files in dist. The deployment URL appears in the workflow run and under **Settings > Pages**.
