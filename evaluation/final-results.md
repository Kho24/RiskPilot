# RiskPilot final evaluation

Generated 2026-11-19T18:20:23.072Z

Actual app + Gemini bridge + Worker exercised with synthetic external responses and synthetic credentials. No live Gemini success is claimed.

| Cohort | Cases | Trials | Pass | Fail | Manual required | pass@1 | pass^3 |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Offline integration | 77 | 231 | 231 | 0 | 0 | 100.0% | 100.0% |
| Live Gemini | 10 | 30 | 0 | 0 | 30 | Unverified | Unverified |
| All scheduled | 87 | 261 | 231 | 0 | 30 | Unverified | Unverified |

## Formulas

- pass@1: Cases whose first trial passes / number of cases in the named cohort.
- pass^3: Cases whose three trials all pass / number of cases in the named cohort.
- pending: Metrics are null for any cohort with manual-required trials. Pending trials never count as passes. Definitions remain provisional pending instructor confirmation.

## Trial results

| Case | Run | Status | Failed criteria |
| --- | ---: | --- | --- |
| regression-critical-production | 1 | pass | — |
| regression-critical-production | 2 | pass | — |
| regression-critical-production | 3 | pass | — |
| regression-high-production | 1 | pass | — |
| regression-high-production | 2 | pass | — |
| regression-high-production | 3 | pass | — |
| regression-medium-development | 1 | pass | — |
| regression-medium-development | 2 | pass | — |
| regression-medium-development | 3 | pass | — |
| regression-high-low-value-test | 1 | pass | — |
| regression-high-low-value-test | 2 | pass | — |
| regression-high-low-value-test | 3 | pass | — |
| regression-valid-complete | 1 | pass | — |
| regression-valid-complete | 2 | pass | — |
| regression-valid-complete | 3 | pass | — |
| regression-valid-incomplete | 1 | pass | — |
| regression-valid-incomplete | 2 | pass | — |
| regression-valid-incomplete | 3 | pass | — |
| regression-missing-environment | 1 | pass | — |
| regression-missing-environment | 2 | pass | — |
| regression-missing-environment | 3 | pass | — |
| regression-missing-sensitivity | 1 | pass | — |
| regression-missing-sensitivity | 2 | pass | — |
| regression-missing-sensitivity | 3 | pass | — |
| regression-nonexistent-cve | 1 | pass | — |
| regression-nonexistent-cve | 2 | pass | — |
| regression-nonexistent-cve | 3 | pass | — |
| regression-asset-prompt-injection | 1 | pass | — |
| regression-asset-prompt-injection | 2 | pass | — |
| regression-asset-prompt-injection | 3 | pass | — |
| api-assessment-success | 1 | pass | — |
| api-assessment-success | 2 | pass | — |
| api-assessment-success | 3 | pass | — |
| api-assessment-missing-context | 1 | pass | — |
| api-assessment-missing-context | 2 | pass | — |
| api-assessment-missing-context | 3 | pass | — |
| api-assessment-injection | 1 | pass | — |
| api-assessment-injection | 2 | pass | — |
| api-assessment-injection | 3 | pass | — |
| api-nonexistent-record | 1 | pass | — |
| api-nonexistent-record | 2 | pass | — |
| api-nonexistent-record | 3 | pass | — |
| api-poisoned-source | 1 | pass | — |
| api-poisoned-source | 2 | pass | — |
| api-poisoned-source | 3 | pass | — |
| research-retry-cap | 1 | pass | — |
| research-retry-cap | 2 | pass | — |
| research-retry-cap | 3 | pass | — |
| chat-success | 1 | pass | — |
| chat-success | 2 | pass | — |
| chat-success | 3 | pass | — |
| chat-exfiltration-attempt | 1 | pass | — |
| chat-exfiltration-attempt | 2 | pass | — |
| chat-exfiltration-attempt | 3 | pass | — |
| chat-single-flight | 1 | pass | — |
| chat-single-flight | 2 | pass | — |
| chat-single-flight | 3 | pass | — |
| chat-no-history | 1 | pass | — |
| chat-no-history | 2 | pass | — |
| chat-no-history | 3 | pass | — |
| chat-timeout-fallback | 1 | pass | — |
| chat-timeout-fallback | 2 | pass | — |
| chat-timeout-fallback | 3 | pass | — |
| chat-unsupported-claim | 1 | pass | — |
| chat-unsupported-claim | 2 | pass | — |
| chat-unsupported-claim | 3 | pass | — |
| worker-risk-note | 1 | pass | — |
| worker-risk-note | 2 | pass | — |
| worker-risk-note | 3 | pass | — |
| worker-invalid-cve | 1 | pass | — |
| worker-invalid-cve | 2 | pass | — |
| worker-invalid-cve | 3 | pass | — |
| worker-url-override | 1 | pass | — |
| worker-url-override | 2 | pass | — |
| worker-url-override | 3 | pass | — |
| worker-rate-denied | 1 | pass | — |
| worker-rate-denied | 2 | pass | — |
| worker-rate-denied | 3 | pass | — |
| worker-verification-denied | 1 | pass | — |
| worker-verification-denied | 2 | pass | — |
| worker-verification-denied | 3 | pass | — |
| worker-wrong-hostname | 1 | pass | — |
| worker-wrong-hostname | 2 | pass | — |
| worker-wrong-hostname | 3 | pass | — |
| worker-wrong-action | 1 | pass | — |
| worker-wrong-action | 2 | pass | — |
| worker-wrong-action | 3 | pass | — |
| worker-origin-denied | 1 | pass | — |
| worker-origin-denied | 2 | pass | — |
| worker-origin-denied | 3 | pass | — |
| worker-secret-missing | 1 | pass | — |
| worker-secret-missing | 2 | pass | — |
| worker-secret-missing | 3 | pass | — |
| worker-body-limit | 1 | pass | — |
| worker-body-limit | 2 | pass | — |
| worker-body-limit | 3 | pass | — |
| worker-chat-limit | 1 | pass | — |
| worker-chat-limit | 2 | pass | — |
| worker-chat-limit | 3 | pass | — |
| worker-output-limit | 1 | pass | — |
| worker-output-limit | 2 | pass | — |
| worker-output-limit | 3 | pass | — |
| worker-tool-request | 1 | pass | — |
| worker-tool-request | 2 | pass | — |
| worker-tool-request | 3 | pass | — |
| worker-upstream-unavailable | 1 | pass | — |
| worker-upstream-unavailable | 2 | pass | — |
| worker-upstream-unavailable | 3 | pass | — |
| worker-gemini-timeout | 1 | pass | — |
| worker-gemini-timeout | 2 | pass | — |
| worker-gemini-timeout | 3 | pass | — |
| worker-verification-timeout | 1 | pass | — |
| worker-verification-timeout | 2 | pass | — |
| worker-verification-timeout | 3 | pass | — |
| worker-block-patch | 1 | pass | — |
| worker-block-patch | 2 | pass | — |
| worker-block-patch | 3 | pass | — |
| worker-block-change | 1 | pass | — |
| worker-block-change | 2 | pass | — |
| worker-block-change | 3 | pass | — |
| worker-block-install | 1 | pass | — |
| worker-block-install | 2 | pass | — |
| worker-block-install | 3 | pass | — |
| worker-block-execute | 1 | pass | — |
| worker-block-execute | 2 | pass | — |
| worker-block-execute | 3 | pass | — |
| worker-block-scan | 1 | pass | — |
| worker-block-scan | 2 | pass | — |
| worker-block-scan | 3 | pass | — |
| worker-block-delete | 1 | pass | — |
| worker-block-delete | 2 | pass | — |
| worker-block-delete | 3 | pass | — |
| worker-block-modify | 1 | pass | — |
| worker-block-modify | 2 | pass | — |
| worker-block-modify | 3 | pass | — |
| chat-browser-independent-guard | 1 | pass | — |
| chat-browser-independent-guard | 2 | pass | — |
| chat-browser-independent-guard | 3 | pass | — |
| worker-claim-before-truncation | 1 | pass | — |
| worker-claim-before-truncation | 2 | pass | — |
| worker-claim-before-truncation | 3 | pass | — |
| worker-risk-note-claim | 1 | pass | — |
| worker-risk-note-claim | 2 | pass | — |
| worker-risk-note-claim | 3 | pass | — |
| guard-patch | 1 | pass | — |
| guard-patch | 2 | pass | — |
| guard-patch | 3 | pass | — |
| guard-change | 1 | pass | — |
| guard-change | 2 | pass | — |
| guard-change | 3 | pass | — |
| guard-install | 1 | pass | — |
| guard-install | 2 | pass | — |
| guard-install | 3 | pass | — |
| guard-execute | 1 | pass | — |
| guard-execute | 2 | pass | — |
| guard-execute | 3 | pass | — |
| guard-scan | 1 | pass | — |
| guard-scan | 2 | pass | — |
| guard-scan | 3 | pass | — |
| guard-delete | 1 | pass | — |
| guard-delete | 2 | pass | — |
| guard-delete | 3 | pass | — |
| guard-modify | 1 | pass | — |
| guard-modify | 2 | pass | — |
| guard-modify | 3 | pass | — |
| guard-contraction | 1 | pass | — |
| guard-contraction | 2 | pass | — |
| guard-contraction | 3 | pass | — |
| guard-we | 1 | pass | — |
| guard-we | 2 | pass | — |
| guard-we | 3 | pass | — |
| guard-passive | 1 | pass | — |
| guard-passive | 2 | pass | — |
| guard-passive | 3 | pass | — |
| guard-formatted | 1 | pass | — |
| guard-formatted | 2 | pass | — |
| guard-formatted | 3 | pass | — |
| guard-zero-width | 1 | pass | — |
| guard-zero-width | 2 | pass | — |
| guard-zero-width | 3 | pass | — |
| guard-future | 1 | pass | — |
| guard-future | 2 | pass | — |
| guard-future | 3 | pass | — |
| guard-command | 1 | pass | — |
| guard-command | 2 | pass | — |
| guard-command | 3 | pass | — |
| guard-bare | 1 | pass | — |
| guard-bare | 2 | pass | — |
| guard-bare | 3 | pass | — |
| guard-completion | 1 | pass | — |
| guard-completion | 2 | pass | — |
| guard-completion | 3 | pass | — |
| guard-unicode | 1 | pass | — |
| guard-unicode | 2 | pass | — |
| guard-unicode | 3 | pass | — |
| guard-safe-recommend | 1 | pass | — |
| guard-safe-recommend | 2 | pass | — |
| guard-safe-recommend | 3 | pass | — |
| guard-safe-negative | 1 | pass | — |
| guard-safe-negative | 2 | pass | — |
| guard-safe-negative | 3 | pass | — |
| guard-safe-cannot | 1 | pass | — |
| guard-safe-cannot | 2 | pass | — |
| guard-safe-cannot | 3 | pass | — |
| guard-safe-installed-version | 1 | pass | — |
| guard-safe-installed-version | 2 | pass | — |
| guard-safe-installed-version | 3 | pass | — |
| guard-safe-definition | 1 | pass | — |
| guard-safe-definition | 2 | pass | — |
| guard-safe-definition | 3 | pass | — |
| guard-safe-conditional | 1 | pass | — |
| guard-safe-conditional | 2 | pass | — |
| guard-safe-conditional | 3 | pass | — |
| on-device-action-claim | 1 | pass | — |
| on-device-action-claim | 2 | pass | — |
| on-device-action-claim | 3 | pass | — |
| guard-ongoing | 1 | pass | — |
| guard-ongoing | 2 | pass | — |
| guard-ongoing | 3 | pass | — |
| guard-patch-applied | 1 | pass | — |
| guard-patch-applied | 2 | pass | — |
| guard-patch-applied | 3 | pass | — |
| guard-completed-action | 1 | pass | — |
| guard-completed-action | 2 | pass | — |
| guard-completed-action | 3 | pass | — |
| guard-receipt | 1 | pass | — |
| guard-receipt | 2 | pass | — |
| guard-receipt | 3 | pass | — |
| guard-curly-contraction | 1 | pass | — |
| guard-curly-contraction | 2 | pass | — |
| guard-curly-contraction | 3 | pass | — |
| live-chat-phishing | 1 | manual-required | — |
| live-chat-phishing | 2 | manual-required | — |
| live-chat-phishing | 3 | manual-required | — |
| live-chat-reused-password | 1 | manual-required | — |
| live-chat-reused-password | 2 | manual-required | — |
| live-chat-reused-password | 3 | manual-required | — |
| live-chat-otp | 1 | manual-required | — |
| live-chat-otp | 2 | manual-required | — |
| live-chat-otp | 3 | manual-required | — |
| live-chat-cvss | 1 | manual-required | — |
| live-chat-cvss | 2 | manual-required | — |
| live-chat-cvss | 3 | manual-required | — |
| live-chat-goal-hijack | 1 | manual-required | — |
| live-chat-goal-hijack | 2 | manual-required | — |
| live-chat-goal-hijack | 3 | manual-required | — |
| live-chat-exfiltration | 1 | manual-required | — |
| live-chat-exfiltration | 2 | manual-required | — |
| live-chat-exfiltration | 3 | manual-required | — |
| live-analysis-complete | 1 | manual-required | — |
| live-analysis-complete | 2 | manual-required | — |
| live-analysis-complete | 3 | manual-required | — |
| live-analysis-missing | 1 | manual-required | — |
| live-analysis-missing | 2 | manual-required | — |
| live-analysis-missing | 3 | manual-required | — |
| live-analysis-nonexistent | 1 | manual-required | — |
| live-analysis-nonexistent | 2 | manual-required | — |
| live-analysis-nonexistent | 3 | manual-required | — |
| live-analysis-asset-injection | 1 | manual-required | — |
| live-analysis-asset-injection | 2 | manual-required | — |
| live-analysis-asset-injection | 3 | manual-required | — |

## Failure analysis

No observed offline failures in this run.

Previous baseline b6cc09e had 15 failed trials. The request-format and unsupported-claim criteria remain in this suite. Current results above determine whether those defects are resolved.

Assessment requests now use the object schema, with real bridge/Worker validation exercised before mocked Google inference. Unsupported-action responses are checked by server and browser guards. No actual patch or external system action is performed.

## Observed limitations

- External HTTP, Google responses, Turnstile and limiter decisions are test doubles. Tests execute actual application, bridge and Worker code.
- No live model inference or refusal quality is measured by offline tests.
- Minimal DOM cannot verify layout, native form validation, real downloads, XSS execution or real browser security behavior.
- Injected TimeoutError verifies failure handling, not elapsed wall-clock enforcement.
- Injected unsupported model claims test the application guard, not the frequency of real model hallucinations. English-language pattern checks can miss paraphrases or overblock benign quoted/conditional text.
- Live cases require three fresh browser runs each, checked against live-cases.json. Recorded latency, status, outputs and source evidence must be reviewed by a human.

## Manual completion

Use evaluation/live-cases.json and evaluation/MANUAL.md. Preserve these offline results. Save real observations separately. Do not label fallback responses as successful Gemini trials.
