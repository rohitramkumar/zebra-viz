# zebra-viz

Tracking NCAA referees

## Developer Notes

### Build referee data

Use `server/data/parse_referees.py` to parse downloaded referee HTML files, geocode each game city with Google Geocoding API, and compute `totalMilesTravelled` per referee.

#### Requirements

- A Google Geocoding API key with Geocoding API enabled.

#### Run

```bash
export GOOGLE_GEOCODING_API_KEY="<your_api_key>"
/workspaces/zebra-viz/.venv/bin/python server/data/parse_referees.py \
	--input-dir server/data \
	--output server/data/referees.json
```

You can also pass the key directly with `--google-api-key`.
