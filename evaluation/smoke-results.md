# RiskPilot Milestone II evaluation

**Mode:** smoke. **Trials:** 4. **Passed:** 4. **Failed:** 0.

Runs use the current workbench handlers and engine in rules mode. The DOM, network responses and download capture are simulated. These results do not measure live source availability, native browser downloads or model behavior.

## Provisional metrics

- `pass@1` **100.0%** — Cases whose first trial passes / number of evaluated cases.
- `pass^3` **Not measured in smoke mode** — Cases whose three trials all pass / number of evaluated cases.

## Trial outcomes

| Case | Trial | Result | Passed criteria | Failed criteria |
| --- | ---: | --- | ---: | --- |
| critical-production | 1 | Pass | 11 | None |
| valid-complete | 1 | Pass | 9 | None |
| nonexistent-cve | 1 | Pass | 9 | None |
| asset-prompt-injection | 1 | Pass | 10 | None |

## Failure analysis

No observed failures in this run.
