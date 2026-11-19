# Final limitations draft

This draft describes the audited checkout. Deployed parity, model behavior,
provider settings and ownership acceptance require manual confirmation.

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
- Current outcomes and exact metrics are in evaluation/final-results.md.
  Offline results cannot establish deployed behavior or live model quality.
- Five public HTTP probes failed ENOTFOUND in this environment. This does
  not establish a public outage. Ten live case definitions, three trials
  each, remain manual-required. No current live model-quality score exists.
- Older user-reported 503/504 behavior is troubleshooting history, not a new
  measured failure of the currently configured paid-key deployment.

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

1. Verify the corrected assessment integration with the live API and real
   browser. Maintain the new entry-point and action-claim regressions.
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
