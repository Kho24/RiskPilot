# Final limitations

This draft describes the audited checkout. The recorded frontend preflight
matched its candidate; Worker identity is owner-attested. Final ordinary-browser
checks are owner-reported PASS. Provider settings, broad model performance and
ownership acceptance remain outside those limited functional observations.

## Functional scope

RiskPilot provides educational chat and provisional vulnerability advisories.
It cannot inspect installed systems, establish exploitability, scan, patch,
execute shell/code, email, delete data, make payments or publish changes.
Remediation steps are advice. The cloud model has no tool declarations,
private infrastructure connector or cross-turn memory.

Gemini adds chat and a short note from ID/score only. It does not run the
rules-backed Remediation and Reviewer stages. The optional on-device path
adds local notes and depends on browser/platform support. Risk ranking is a
documented project heuristic; a correct score does not establish local impact.

## Evaluation history and current verification limits

- Baseline b6cc09e recorded 15 failed offline trials. The positional-argument
  bug is now corrected to the existing object schema. The four affected
  assessment cases retain their original criteria.
- The former displayed false "patched" claim is now replaced by an advisory
  statement. Tests inject all seven prohibited action types through the Worker
  and test the independent browser and optional local-model guards. These
  synthetic responses do not measure real Gemini hallucination frequency.
- Automated final-system evaluation passed 231/231 offline trials: 77 cases x 3,
  pass@1 = 100% and pass^3 = 100%. Current schema, security guardrails,
  regressions, adversarial cases and output validation are covered. Actual
  code runs against synthetic provider responses; this is not live model quality.
- Three production Playwright attempts of live-chat-phishing failed during
  browser verification, with no Worker/Gemini response. Trial 3 directly captured
  zero Worker POSTs and no token before the frontend's 12-second deadline.
  Trials 1 and 2 have consistent fallback/timing but less diagnostic coverage.
  No Worker or Gemini defect was demonstrated; all three remain failures and
  the other 27 production slots remain unrun.
- Turnstile is a production security gate preventing the instrumented browser
  from reaching the API. Cloudflare documents that automated browsers can be
  detected and blocked; production Turnstile automation is not a supported
  verification path here. The challenge-resource HTTP 401 alone does not prove
  the exact provider cause. Ordinary-browser live verification is separately
  owner-reported PASS; this does not regrade the production automation failures.
- Earlier ENOTFOUND probes describe this environment's network limitation,
  not a public outage. No current live model-quality score exists.
- Older user-reported 503/504 behavior is troubleshooting history, not a new
  measured failure of the currently configured paid-key deployment.

The production attempts are preserved in evaluation/live-results.json and
live-results.md. The separate final-results.json live entries are the offline
generator's plan placeholders, not observed production outcomes. Do not resume
production automation or use test keys, token replay, stealth settings or
changed security controls to obtain a pass. The actual production control stays
intact. Cloudflare reference:
https://developers.cloudflare.com/turnstile/troubleshooting/testing/

The owner reports Gemini chat, real CVE assessment with all three stages,
adversarial advisory-only output, and all six approval/export checks passed.
The source is evaluation/manual-results.json and evaluation/MANUAL.md, not an
independent API trace. Exact timestamps and transcripts were not supplied.
The short checklist verifies release behavior, not 30 genuine-model
trials. Confirm rubric interpretation; if required, execute the existing 10 live
cases three times manually with unchanged criteria. None of the saved failures
may be converted into passes. Recommendation remains **SHIP WITH GATES**,
with the manual functional gate owner-reported complete; operational settings
and owner release acceptance/approval remain responsibilities.

## Remaining security weaknesses

Untrusted text can manipulate generated advice. System prompts are guidance
and do not guarantee safe responses. Reviewer rules do not inspect cloud
notes. Sensitive chat is sent to Google with no redaction/DLP. HTTPS source
references may point to arbitrary hosts. Code fixes initial request
destinations but has no general egress firewall or redirect rejection.
Turnstile is a third-party script with page access.

The IP limiter is approximate/per-location. There is no strict global
spending budget, shared daily call cap, account authentication or durable
approval trail. The API accepts a syntactically valid CVE and caller score
without server-side fact lookup. A conservative English-language pattern guard
checks model text before truncation. It can miss unfamiliar paraphrases or
non-English claims, and may replace benign quotations or conditional wording.
It does not validate all facts or establish actual asset applicability.
Source response size, retained chat DOM and session
turn count are unbounded. Local model creation can hang without a deadline.

Client-side approval gates export but cannot enforce organizational review
or prevent copying visible text. Navigation refresh can lose work, and
browser history/session restoration may restore a page. Downloaded reports
contain submitted context. Provider logging, retention, billing and deployed
bindings are unverified.

## With another month

1. Expand the owner-reported browser checks into repeated, captured live-model
   verification while preserving Turnstile. Maintain entry-point and action-claim regressions.
2. Evaluate genuine model responses over repeated normal/adversarial trials.
   Add evidence-bound claim checking and clearly separate unverified model
   commentary from verified source data. Include cloud notes in meaningful
   review before approving them.
3. Improve privacy and cost controls with deliberate input minimization,
   sensitive-data handling, a strict shared request/spend budget, source-size
   caps and explicit retention decisions.
4. Validate permitted source links/redirect behavior, review third-party
   scripts and record minimal structured operational error metadata without
   storing prompts or secrets.
5. If the use case requires organizational approvals, add authenticated,
   durable report-bound approval records. Keep real infrastructure actions
   outside the model's permissions until separately designed and reviewed.

Priorities above are proposed follow-up work, not implemented defenses.
