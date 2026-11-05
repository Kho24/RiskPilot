# RiskPilot

A browser-based vulnerability assessment and remediation workbench. Serve the dist folder over HTTP, or HTTPS for supported on-device AI. For example, with Python installed, run this command from the project folder and open http://localhost:8080.

    python -m http.server 8080 --directory dist

- Load the Log4Shell demo to try the workflow using a labeled offline snapshot.
- Enter a CVE manually for a live lookup against the CVE Program public CVE List. The lookup sends the CVE identifier. Asset details stay in the current page.
- Queue up to five findings for a report ordered by provisional risk. A finding with no usable base score stays undetermined.
- Select on-device AI to request supplemental notes from the Risk Analyst, Remediation and Reviewer stages. The app uses the browser Prompt API when a model is installed and available, and falls back to the rules engine otherwise.
- Download the standalone HTML report to retain findings and the execution trace.

The risk formula is a project heuristic and appears in the report. Validate applicability, exposure and remediation decisions with a human analyst.

## GitHub Pages

Push this repository to GitHub on the main branch. In the repository, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**. In **Actions**, run **Deploy RiskPilot to GitHub Pages** if the first push happened before Pages was enabled. Future pushes to main deploy the static files in dist. The deployment URL appears in the workflow run and under **Settings > Pages**.
