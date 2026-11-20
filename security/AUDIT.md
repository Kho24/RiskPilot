# RiskPilot final implementation and security audit

Audit date: 2026-11-19. Repository: Kho24/RiskPilot.
Branch at audit start: feature/gemini-risk-note. Starting HEAD: c07e954.
Fix follow-up starts from b6cc09e. Only the confirmed request-format and
unsupported-action-claim defects were corrected in this follow-up.
Scope is the current local checkout, including the previously approved local
navigation edits. Deployed parity could not be established because all five
read-only network probes failed DNS resolution (evaluation/network-results.json).
No Cloudflare secrets, environment values, credential caches or dashboard
contents were read. No production changes were performed.

## 1. Actual execution and trust boundaries

The application orchestrates a bounded workflow. Adding a Gemini credential
enables inference, but does not grant the model operating-system permissions,
arbitrary browsing, infrastructure access or tool selection.

| Input | Source | Where it goes |
| --- | --- | --- |
| Typed chat text | Anonymous user, up to 300 browser characters | Current message only goes through dist/chat.js submit handler, dist/gemini.js and Worker /api/chat to Google. Quoted emails, URLs, CVEs or instructions inside it are all untrusted. |
| CVE ID | Form or validated cve query parameter, normalized uppercase | Used to build public lookup URLs. Intended Gemini note payload is the ID plus verified numeric score. |
| System name, environment, criticality, sensitivity, exposure, software/version | Form or predefined editable demo; queue copies retain values | Local risk formula/report/reviewer. Excluded from intended cloud Gemini note. They reach the optional on-device model when enabled. |
| Demo selector / demo query parameter | User | Only known predefined demo keys load snapshots. Demo text affects optional on-device prompts. Demos do not invoke Gemini notes. |
| Queue, Gemini/on-device toggles | User | Control local orchestration. Maximum five queued findings. Single live scored finding required for cloud note. |
| Approve / revision / reject | User | Local approval state, trace and export handler. Never included in a Gemini request. |
| Direct API body | Any client able to satisfy origin, verification and limit checks | Worker requires exactly message+token or cve+score+token. Client-supplied CVE/score are schema-checked, not independently researched by Worker. |
| Turnstile token | Third-party script/browser verification | Browser sends to Worker, Worker sends to Cloudflare verification. Not included in model contents. |

### External responses and stage-to-stage data

- dist/engine.js research reads a matching CVE JSON record. parseCve accepts
  public descriptions, affected product names, references, CVSS and state.
  enrichScore optionally reads matching NVD CVSS entries and attribution.
  Source content remains untrusted even when it comes from the expected host.
- Cloud Gemini note input contains only CVE ID and numeric CVSS. Retrieved
  descriptions, reference URLs, product names and asset fields are excluded.
  app.js now calls geminiNote({cve, score}). gemini.js adds the token and
  Worker accepts the existing exact schema before mapping score to cvss for
  Google. Previously the positional string became numbered JSON keys and
  Worker correctly returned 400. The original criteria remain in the suite.
- Turnstile response (success, hostname, action) gates the Worker call and is
  never model input. Google text is returned to the requesting browser, not
  forwarded into another Google turn. Thought-marked parts are filtered out.
- Evidence and finding enter assess. Assessment and evidence enter plan and
  review as coded. Reviewer rules check missing context and evidence state.
  They do not verify free-text model claims.
- Optional on-device agentNote receives a system prompt and JSON:
  Risk Analyst gets finding/evidence/assessment; Remediation gets
  finding/assessment/steps and the earlier local analyst note; Reviewer gets
  finding/evidence/assessment/steps/issues and prior local notes.
  Earlier on-device output can therefore influence later local-model notes.
  Each note creates and destroys a fresh model session.
- The Gemini cloud note is rendered beside the report. Neither the rules
  Reviewer nor the on-device Reviewer is supplied cloudNote. Human review is
  the only semantic review of that cloud text before advisory export.
  A separate shared advisory guard filters recognized unsupported action claims
  at the Worker and browser bridge. The same guard filters local model notes
  before they reach later stages. It is not a general fact checker.

## 2. Real tools and permissions

These are application-invoked capabilities. Google receives no tools or
function declarations, and no response is interpreted as a tool command.

| Capability / code | Reads | Sends and destination | Effects and permissions |
| --- | --- | --- | --- |
| CVE research, engine.js research | Public CVE JSON | GET with CVE in path to raw.githubusercontent.com/CVEProject/cvelistV5 | Read-only retrieval, no scan, private credential or write permission. |
| NVD enrichment, enrichScore | Public CVSS data | GET CVE query to services.nvd.nist.gov | Read-only retrieval. |
| Browser verification, gemini.js | Widget token/status | Loads script from challenges.cloudflare.com; script performs provider-managed verification traffic | Third-party script runs in page. Exact provider subrequests/cookies require browser verification. |
| Worker verification, worker/index.mjs | success/hostname/action | POST token, client IP and secret to challenges.cloudflare.com/turnstile/v0/siteverify | Consumes verification token. No access to asset systems. |
| Worker rate limiter | IP-based allowance | env.NOTE_RATE_LIMIT.limit, within Cloudflare | Updates provider counters. Configured 5 per IP/60 seconds, shared across the two routes. Approximate and per Cloudflare location. |
| Gemini generation, Worker | Google generation JSON | POST fixed model endpoint at generativelanguage.googleapis.com, API key in header; model sees system instruction plus current message OR cve/cvss | Consumes inference quota/billing. No infrastructure tool access. |
| Optional on-device model, engine.js agentNote | Local model text | Browser Prompt API, no explicit application network request | Advisory notes. Browser model installation/telemetry behavior is platform-dependent. |
| Export, app.js download handler | Rendered report/context/trace | Local Blob URL and browser download | Creates user-controlled HTML file after approval. No cloud upload or publication. |
| Evidence and education links | External pages if user clicks | cve.org, nvd.nist.gov, logging.apache.org, github.com, consumer.ftc.gov and HTTPS URLs supplied by CVE reference data | Human-initiated navigation. Reference destinations are not limited to these named hosts. |

GitHub Actions publishes dist/ on main pushes or workflow_dispatch. It is
deployment machinery, not an agent-callable tool. The Worker is deployed
separately. Evaluation and security files sit outside dist/ and are excluded
from the Pages artifact by .github/workflows/pages.yml.

Gemini cannot select a URL, initiate a fetch or execute a returned function
call through the application. Initial fetch destinations are hard-coded,
with validated identifiers/model configuration. There is no general egress
firewall or connect-src CSP. Fetch follows redirects by default. The fixed
destination claim is about code-selected initial requests, not every possible
redirect or provider script request. HTTPS CVE reference links allow arbitrary
hosts, but require a click. Model text is assigned with textContent and is not
automatically linkified or rendered as HTML.

## 3. Secrets, private data, routing and storage

GitHub Pages browser -> Turnstile widget -> Worker /api/chat or /api/risk-note
-> server-side verification and rate-limit checks -> Google generateContent
-> Worker extracts bounded text -> browser renders text.

The API key is read by the Worker only and used in x-goog-api-key, not the
model prompt. TURNSTILE_SECRET_KEY is only used in server-side verification.
The browser includes a public Turnstile site key and short-lived verification
tokens by design. CORS permits https://kho24.github.io and POST/OPTIONS.
The Worker also checks Origin, but non-browser clients can forge that header.
Turnstile and server rate checks provide additional gates.

There is no private-infrastructure connector, private file reader, mailbox,
payment service, GitHub write token or cloud-admin credential in agent tools.
Users can still paste private information into chat: it will be sent to Google.
Warnings are guidance, not a DLP filter or redaction layer. Asset details stay
in the page/cloud-note exclusion boundary, but enter optional local prompts
and the downloaded report.

No application use of localStorage, sessionStorage, IndexedDB, document.cookie,
service workers or remote database was found. Chat turns, queue, results,
toggles and approval live in page memory. Refresh/navigation ordinarily
reinitializes them; browser back/forward caching or session restoration can
restore a page. There is no explicit secure erasure on tab/browser close.
Downloaded reports persist until the owner deletes them. No automatic prompt
archive is implemented. Evaluation outputs are files in the repository and
use synthetic inputs only.

Provider access logs, Google/Cloudflare retention, Turnstile cookies, billing
and active dashboard configuration were not verified. They must not be
described as absent. Google necessarily processes submitted inference input.
No full chat history is sent on subsequent turns.

secret-scan.json records a non-value-printing pattern scan. It excludes
untracked .wrangler state and Git history. Source review found references to
secret names, test-only placeholders and the public site key, with no embedded
application credential identified. This is not a guarantee about dashboards,
untracked files, history or provider storage.

## 4. Human gate and accountability

Risk Analyst -> Remediation -> Reviewer -> Draft / Pending Human Review ->
Approve -> final advisory HTML export. The displayed finding includes CVE,
priority/CVSS, entered context, research/source attribution, remediation,
reviewer flags and any generated notes.

setApproval controls status, actions and button. download's own handler
also checks Human Approved. Reject and Request Revision block export.
Revision records the choice and asks the user to update and rerun. A new run
clears approval immediately, including while processing. One decision applies
to the whole generated report. No decision patches, scans, emails or changes
an external system. Gate is client-side and has no identity check, signature,
durable approval log or organizational separation of duties. Model output
is already visible and already processed externally before this gate.
Accountable owner: kho24 (student/project owner).

## 5. Logging and enforced caps

The in-page trace records CVE, attempts, source states/errors, stage completion
and approval choices. It is replaced each run and included in exported HTML.
Chat displays messages/results/status but no durable audit log. The Worker
has no application console logging. Browser devtools and provider operational
logs may retain request metadata. Final evaluation records exact synthetic
outputs, failed criteria, timestamps and production source hashes.

| Limit | Enforcement | Scope / gap |
| --- | --- | --- |
| Queue of 5 | app.js queue handler | Client-side. Five findings can each perform research. |
| At most 3 research HTTP attempts per finding | engine.js research loop; enrichment only when attempt < 3 | At most 15 research fetches for a five-finding queue. 404 stops immediately. Retry delays 400/800 ms. |
| Research request 8 seconds | AbortSignal.timeout | Each CVE/NVD request; no source response-byte cap. |
| One cloud generation per eligible finding/run, no automatic retry | app.js, gemini.js, Worker | Only single live scored CVE. Chat one request per submission. No model-selected loop. |
| Chat single-flight | chat.js sending flag and disabled controls | One outstanding chat submission per page. No global concurrency/turn cap. |
| Turnstile loading/token wait 12 seconds | gemini.js deadline + race | Depends on browser user interaction. |
| Worker verification 4 seconds | Worker timeout signal | Timeout maps to generic 504. |
| Worker Gemini 25 seconds | Worker timeout signal | Generic 504 does not identify upstream stage. |
| Browser API call 40 seconds | gemini.js timeout signal | Fallback on failure. |
| Local model prompt 16 seconds, result 1,400 chars | agentNote | Up to 3 notes/finding, 15/queue. No timeout for model creation/availability. |
| Chat 300, CVE 30, asset 120, software/version 160 characters | HTML maxlength; CVE pattern and select choices | Browser constraints, not universal server validation of local forms. |
| Worker body <=4,096 bytes | Streaming body reader | No total body-read deadline. |
| Worker token <=2,048 chars | Worker schema | Verification still required. |
| Chat <=300 chars | Worker schema | Rejects empty trimmed text and extra fields. |
| CVE shape and finite score 0..10 | Worker schema | Score/CVE truth is not independently verified at API boundary. |
| Google maxOutputTokens 512, low thinking | generationConfig | Upstream generation setting; non-deterministic output and token-limit truncation possible. |
| Returned note <=1,600 chat / 600 assessment chars | Worker extraction | Advisory-action check runs before truncation. Truncation can still cut ordinary advice. |
| 8 CVE reference candidates and 8 unique products | parseCve slicing | HTTPS scheme only; no host restriction or per-string length bound. |
| 5 requests/IP/60 seconds | Configured Cloudflare binding + code denial | Provider enforcement approximate/per-location; no strict shared daily budget. |
| No autonomous agent-iteration loop | Architecture | No session-turn total, total DOM/history cap or global spending limit. |
| No native form submission | form-action 'none', forms hidden until JS initialized | Browser-enforced form prevention. Does not constrain fetch or redact chat. |
| Prompt-only guidance | System prompts | Defensive scope, untrusted input, no invented facts, short replies. Not proof of resistance. |

## 6. Lethal trifecta and concrete exfiltration analysis

Untrusted content is present in anonymous chat, CVE data and optional
on-device prompts. Private data is restricted: the model cannot read Worker
secrets, private files or infrastructure. User-entered sensitive chat is an
exception. External communication is present for Google and CVE tools, but
the model cannot choose destinations or call them.

Concrete candidate attack: a user pastes a malicious support email and a
fictional recovery code into chat. The email instructs Gemini to transmit that
code to https://collector.example.invalid/collect. If Gemini follows it,
application code has no fetch/function executor for that destination and
renders returned HTML/URLs as text. The model-directed external-communication
leg is restricted. Worker secret access is separately removed from model
context. Tests inject a tool call and HTML image text and observe no
collector request in the controlled transport.

Residual realistic disclosure path: Gemini could persuade a user to copy
sensitive details into an attacker site manually. Prompt instructions are the
only content-level defense against that persuasion. Human report approval
gates export, not chat persuasion, Google input transmission or reference
navigation. Entered secrets already travel to Google; no DLP prevents that.
The candidate is a threat model, not a demonstrated live data theft.

## 7. OWASP Agentic mapping (three relevant categories)

- ASI01, Agent Goal Hijack: chat instructions and poisoned source text could
  redirect advisory content. Fixed tool orchestration limits consequences;
  optional local model notes still accept untrusted source descriptions.
- ASI08, Cascading Failures: an unverified source score affects priority, plan
  and review. Prior local model notes also enter later local prompts.
  Unknown-score handling and source identity checks help but do not establish
  source truth or semantic accuracy.
- ASI09, Human-Agent Trust Exploitation: confident unsupported guidance may
  persuade the user to approve or act. Baseline fault injection exposed a
  displayed false "patched" claim. Current tests exercise its replacement
  with a truthful advisory statement. The approval gate requires a click but
  does not independently validate the recommendation.

This is a mapping of relevant behaviors, not certification. Categories
describe risks; they do not imply this app has autonomous write tools.

## 8. Layered guardrails

| Actual guardrail and enforcement | Trifecta leg reduced/gated | Attack addressed | Remaining weakness |
| --- | --- | --- | --- |
| Worker-only secret bindings, credentials excluded from contents | Private data | Prompt asking for API key cannot read actual binding through model context | User-pasted secrets are still submitted; malicious page script/supply chain is a different boundary. |
| No model tools/executor; fixed initial fetch URLs | External communication | Injected destination or returned function call has no execution path | Human can follow bad advice; redirects and third-party script network are not globally allowlisted. |
| Cloud note schema, only ID/numeric score forwarded | Untrusted content and private data | Asset/source prose injection excluded from cloud note; caller schema now verified | Direct API score can be forged; cloud chat still accepts text. |
| Shared advisory-action guard in dist/advisory.js, enforced by Worker, browser bridge and local-model adapter | Untrusted output / human-mediated external action | Recognized claims of patching, changing servers, installing software, executing commands, scanning, deleting or modifying infrastructure are replaced | English patterns can miss paraphrases or overblock benign quoted/conditional text. No general semantic proof. |
| DOM textContent for output | External communication through active content | Model HTML image/script cannot automatically send data when rendered | Semantic lies remain readable; source reference links are clickable. |
| Approval status and download-handler guard | External communication via advisory distribution | Premature final export blocked until explicit human decision | Local and unauthenticated; does not gate Google calls or visible chat. |
| Size caps, deadline signals, server verification and limiter | Untrusted input / external communication | Oversized requests, repeated paid calls and invalid browser tokens | Approximate limiter, no daily budget or global cap; provider config needs live check. |
| CVE identity match and bounded score parsing | Untrusted retrieved content | Wrong-record response rejected; unknown score stays Undetermined | Authentic-looking malicious source prose/numeric values still possible; links not host-validated. |

## 9. Evaluation, limitations and release decision

evaluation/final-results.* contains 3 fresh trials per offline case, the
retained 10 regression cases, current API integration and failure injection.
Live cases are explicitly manual-required. No live API response, refusal or
browser safety claim is derived from mocked responses. See LIMITATIONS.md.

Recommendation: **SHIP WITH GATES** for this final candidate. The request
schema is fixed and the original failing action claim is filtered. The expanded
offline suite retains the old criteria and tests all seven prohibited action
types, wording variations, safe advice and independent server/browser/local
guard boundaries. No current live model-quality result is available.

Release gates: complete the 30 live trials and browser approval tests, review
the guard's false-positive and paraphrase limitations, verify active Cloudflare
config/cost/retention and obtain owner deployment approval. The existing public
installation has not been altered by these local fixes.

## Sources

- Repository evidence: dist/app.js run/setApproval/download; dist/chat.js
  submit/appendTurn; dist/gemini.js setupGemini; dist/engine.js
  research/parseCve/enrichScore/agentNote; worker/index.mjs fetch;
  worker/wrangler.toml; .github/workflows/pages.yml.
- Evaluation evidence: evaluation/final-results.json, final-results.md,
  network-results.json and live-cases.json.
- OWASP GenAI Security Project, OWASP Top 10 for Agentic Applications 2026:
  https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- Lethal trifecta definition:
  https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- Cloudflare rate-limit accuracy and per-location scope:
  https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
