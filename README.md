# zebra-viz

Tracking NCAA referees

## Developer Notes

### Build referee data

Use `data/refresh-referee-data.py` to parse downloaded referee HTML files, geocode each game city with Google Geocoding API, and compute `totalMilesTravelled` per referee.

#### Requirements

- A Google Geocoding API key with Geocoding API enabled.

#### Run

```bash
export GOOGLE_GEOCODING_API_KEY="<your_api_key>"
/workspaces/zebra-viz/.venv/bin/python data/refresh-referee-data.py \
	--input-dir data \
	--output data/referees.json
```

You can also pass the key directly with `--google-api-key`.

## CI / Scheduled workflow

A GitHub Actions workflow (`.github/workflows/refresh-referee-data.yml`) runs `refresh-referee-data.py` automatically every day at **9 AM EST / 10 AM EDT** and commits the refreshed `data/referees.json` back to the branch. It can also be triggered manually from the **Actions** tab via `workflow_dispatch`.

### Running the workflow manually

In addition to the daily schedule, the workflow can be triggered at any time from the GitHub UI:

1. Go to your repository on GitHub.
2. Click the **Actions** tab.
3. Select **Refresh Referee Data** in the left-hand workflow list.
4. Click **Run workflow** (top-right of the run list).
5. Choose the branch you want to run it on and click **Run workflow**.

The run will appear in the list within a few seconds. Once it completes, a new commit updating `data/referees.json` will be pushed to the selected branch (only if the data changed).

### Required repository secrets

The workflow reads three secrets from the repository. To set them:

1. Go to your repository on GitHub.
2. Click **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** and add each of the following:

| Secret name | Required | Description |
|---|---|---|
| `GOOGLE_GEOCODING_API_KEY` | **Yes** | Google Geocoding API key with the Geocoding API enabled. Used to resolve game locations to coordinates. |
| `KENPOM_EMAIL` | No | Email address for a kenpom.com account. When provided together with `KENPOM_PASSWORD`, the workflow scrapes live referee data directly from kenpom.com instead of using local HTML files. |
| `KENPOM_PASSWORD` | No | Password for the kenpom.com account above. |

> **Note:** If `KENPOM_EMAIL` and `KENPOM_PASSWORD` are omitted the script falls back to parsing any `*.html` files already present in the `data/` directory.
