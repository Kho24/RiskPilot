# RiskPilot — final security review draft

**Owner:** [YOUR FULL NAME], student/project owner. **Review:** 2026-11-19.
**Recommendation: DO NOT SHIP YET** for the final candidate.

RiskPilot provides educational chat and vulnerability advisories. It researches
public CVEs and proposes remediation, with human approval required before
export. Gemini handles chat and an intended short Risk Analyst note. It has
no model-callable patching, scanning, email, shell or private-system tools.

**Untrusted inputs.** Anonymous chat, CVE IDs, asset names, environment,
criticality, sensitivity, exposure and software versions can be inaccurate or
malicious. Public CVE descriptions, scores and reference links also require
caution. Cloud chat receives the current message. The intended cloud note
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
approval. Server verification, request/output caps and an approximate IP
rate limit constrain API abuse. These controls do not validate advice or
provide a strict daily spending budget.

**Evaluation evidence.** The final suite runs 38 offline cases three times
using actual application/Worker code with synthetic provider responses.
Four assessment cases expose a request-format defect before Google is
called. Fault injection also shows a false model claim of patching a server
is displayed without validation. This does not demonstrate that live Gemini
made that claim. Approval/export checks and restricted transport are tested
independently. Ten live cases, three trials each, remain unverified. Public
HTTP probes failed DNS resolution here, so deployment parity is unconfirmed.

**Release gates and limitations.** Correct the assessment integration, resolve
or explicitly accept the unsupported-claim risk, rerun tests and complete
live model/browser verification before approving a release. Confirm active
Cloudflare bindings, logging, retention and billing with the owner. The gate
is local and unauthenticated. Pasted chat is sent to Google without automatic
redaction. Provider retention and real model resistance are unverified.
The existing public installation was preserved during this review.

Evidence: [audit](AUDIT.md), [evaluation](../evaluation/final-results.md),
[limitations](LIMITATIONS.md). Category source:
[OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
