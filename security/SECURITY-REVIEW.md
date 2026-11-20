# RiskPilot — final security review draft

**Owner:** [YOUR FULL NAME], student/project owner. **Review:** 2026-11-19.
**Recommendation: SHIP WITH GATES** for the final candidate.

RiskPilot provides educational chat and vulnerability advisories. It researches
public CVEs and proposes remediation, with human approval required before
export. Gemini handles chat and a short Risk Analyst note. It has
no model-callable patching, scanning, email, shell or private-system tools.

**Untrusted inputs.** Anonymous chat, CVE IDs, asset names, environment,
criticality, sensitivity, exposure and software versions can be inaccurate or
malicious. Public CVE descriptions, scores and reference links also require
caution. Cloud chat receives the current message. The cloud note
receives only ID/score. Optional on-device notes receive fuller context,
retrieved evidence and earlier local-stage notes.

**Lethal trifecta.** RiskPilot combines untrusted content and external services,
while restricting private-data access and model-directed communication.
A malicious email pasted into chat could instruct Gemini to send a recovery
code to an attacker website. The application has no executor for such a
request and renders model output as text. Worker API secrets are outside
model context. These restrictions reduce the external-communication and
private-data legs. Users can still disclose secrets in chat or follow harmful
advice manually. Approval does not gate Google input transmission.

**Relevant OWASP Agentic risks.** ASI01, Agent Goal Hijack, applies when
malicious instructions redirect advice. ASI08, Cascading Failures, applies
when incorrect source scores or earlier local-model notes influence later
stages. ASI09, Human-Agent Trust Exploitation, applies when confident,
unsupported advice persuades someone to approve or act.

**Layered controls.** Server-side credentials keep operational secrets out of
model input (private-data leg). Fixed initial destinations and absence of
model tool execution restrict attacker-directed transmission (external
communication). Minimal cloud-note fields reduce exposure to asset/source
prose (untrusted content). Text rendering prevents returned HTML from
initiating image/script requests. Export checks require explicit report
approval. An advisory-only instruction and shared output guard replace
recognized unsupported-action claims at the Worker, browser bridge and
optional local-model boundary. Server verification, size/time caps and an
approximate IP limit constrain API abuse. General advice accuracy and a
strict daily spending budget remain outside these controls.

**Evaluation evidence.** The expanded final suite runs 77 offline cases three
times using actual application/Worker code and synthetic provider responses.
The original assessment-request and false-action-claim criteria are retained.
New cases cover seven prohibited action types, wording variations, safe advice
and independent guard boundaries. Baseline commit b6cc09e preserves the earlier
15 failures. Exact current outcomes are in the evaluation report. Ten live
cases, three trials each, remain unverified. Prior public HTTP probes failed
DNS resolution here, so deployment parity is unconfirmed.

**Release gates and limitations.** Complete live model/browser verification
and owner deployment approval. Confirm active Cloudflare bindings, logging,
retention and billing. The English-language guard can miss paraphrases or
replace benign quoted/conditional wording. It cannot validate every fact.
Approval is local and unauthenticated. Pasted chat goes to Google without
automatic redaction. Provider retention and real model resistance remain
unverified. These fixes are local and the public installation was preserved.

Evidence: [audit](AUDIT.md), [evaluation](../evaluation/final-results.md),
[limitations](LIMITATIONS.md). Category source:
[OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
