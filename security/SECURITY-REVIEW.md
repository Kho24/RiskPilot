# RiskPilot - final security review

**Owner:** kho24, student/project owner. **Review:** 2026-11-19.
**Recommendation: SHIP WITH GATES**, retaining existing controls and owner release approval.

RiskPilot provides educational chat and vulnerability advisories. Read-only CVE
research feeds proposed remediation and review; human approval gates advisory
export. Gemini supplies chat and a short Risk Analyst note. It has no callable
patching, scanning, email, shell or private-infrastructure tools.

**Untrusted inputs.** Anonymous chat, CVE IDs, asset names, environment,
criticality, sensitivity, exposure and product/version fields may be malicious.
Public CVE descriptions, scores, reference URLs and earlier local-stage notes
also need scrutiny. Cloud chat receives the current message; the cloud note
receives only ID/score. Optional on-device notes receive fuller context,
retrieved evidence and earlier local notes.

**Lethal trifecta.** Untrusted content meets external services, but private-data
access and model-directed communication are restricted. A malicious email
pasted into chat could instruct Gemini to send a recovery code to an attacker
website. RiskPilot has no executor for that request and displays model text
without executing it. Worker credentials are outside model context. These
controls restrict the external-communication and private-data legs. A user can
still disclose secrets or follow harmful advice. Approval does not gate
transmission of the user's message to Google.

**OWASP Agentic risks.** ASI01, Agent Goal Hijack: malicious text redirects
advice. ASI08, Cascading Failures: incorrect CVE scores or earlier local notes
influence later stages. ASI09, Human-Agent Trust Exploitation: confident but
unsupported advice persuades a person to approve or act.

**Layered guardrails.** Server-side secrets restrict private-data exposure.
Fixed initial destinations, no model tool executor and text rendering restrict
attacker-directed external communication. ID/score-only cloud notes reduce
untrusted asset/source prose. Export requires explicit human approval.
Advisory-only instructions and application guards replace recognized false
action claims at Worker, browser and optional local-model boundaries.
Production Turnstile gates API access; server validation, size/time caps and an
approximate IP limit constrain abuse. Turnstile is not a factual verifier or
a prompt-injection defense.

**Evaluation evidence.** The automated final-system suite passed 231/231
offline trials: 77 cases x 3; pass@1 and pass^3 both 100%. Actual application,
bridge and Worker code exercised the current schema, guardrails, regressions,
adversarial cases and output validation against synthetic provider responses.
This does not measure real Gemini quality. Baseline b6cc09e retains 15 earlier
offline failures. Three production Playwright attempts failed at browser
verification with no Worker/Gemini response; trial 3 directly confirms zero
Worker POSTs. No Worker or Gemini defect was demonstrated. Turnstile is a
production security gate that prevents this automation path; Cloudflare warns
that Playwright may be detected and blocked. These failures remain failures.
The owner separately reports successful ordinary-browser Gemini chat, live
CVE/stage completion, adversarial refusal/advisory output and all six
approval/export checks. These are manual observations, not repeated live metrics.

**Release gates and limitations.** The manual checklist is owner-reported PASS;
exact execution timestamps and transcripts were not supplied. Confirm provider
logging, retention, bindings, billing and instructor acceptance of
offline versus live evaluation evidence. The English guard misses paraphrases
and can replace benign text. Approval is local and unauthenticated; chat has no
automatic redaction; no strict shared spending cap exists. Broad repeated
live-model quality remains unmeasured. Preserve Turnstile and require owner approval
for any release.

Evidence: [evaluation](../evaluation/final-results.md),
[live failures](../evaluation/live-results.md), [manual checks](../evaluation/MANUAL.md),
[audit](AUDIT.md), [limitations](LIMITATIONS.md).
Sources: [OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/),
[Cloudflare automation guidance](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
