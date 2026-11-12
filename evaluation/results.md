# RiskPilot Milestone II evaluation

**Mode:** full. **Trials:** 30. **Passed:** 30. **Failed:** 0.

Runs use the current workbench handlers and engine in rules mode. The DOM, network responses and download capture are simulated. These results do not measure live source availability, native browser downloads or model behavior.

## Provisional metrics

- `pass@1` **100.0%** — Cases whose first trial passes / number of evaluated cases.
- `pass^3` **100.0%** — Cases whose three trials all pass / number of evaluated cases.

## Trial outcomes

| Case | Trial | Result | Passed criteria | Failed criteria |
| --- | ---: | --- | ---: | --- |
| critical-production | 1 | Pass | 11 | None |
| critical-production | 2 | Pass | 11 | None |
| critical-production | 3 | Pass | 11 | None |
| high-production | 1 | Pass | 10 | None |
| high-production | 2 | Pass | 10 | None |
| high-production | 3 | Pass | 10 | None |
| medium-development | 1 | Pass | 10 | None |
| medium-development | 2 | Pass | 10 | None |
| medium-development | 3 | Pass | 10 | None |
| high-low-value-test | 1 | Pass | 9 | None |
| high-low-value-test | 2 | Pass | 9 | None |
| high-low-value-test | 3 | Pass | 9 | None |
| valid-complete | 1 | Pass | 9 | None |
| valid-complete | 2 | Pass | 9 | None |
| valid-complete | 3 | Pass | 9 | None |
| valid-incomplete | 1 | Pass | 9 | None |
| valid-incomplete | 2 | Pass | 9 | None |
| valid-incomplete | 3 | Pass | 9 | None |
| missing-environment | 1 | Pass | 9 | None |
| missing-environment | 2 | Pass | 9 | None |
| missing-environment | 3 | Pass | 9 | None |
| missing-sensitivity | 1 | Pass | 9 | None |
| missing-sensitivity | 2 | Pass | 9 | None |
| missing-sensitivity | 3 | Pass | 9 | None |
| nonexistent-cve | 1 | Pass | 9 | None |
| nonexistent-cve | 2 | Pass | 9 | None |
| nonexistent-cve | 3 | Pass | 9 | None |
| asset-prompt-injection | 1 | Pass | 10 | None |
| asset-prompt-injection | 2 | Pass | 10 | None |
| asset-prompt-injection | 3 | Pass | 10 | None |

## Failure analysis

No observed failures in this run.
