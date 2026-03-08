#!/usr/bin/env python3

from __future__ import annotations

import argparse
import collections
import glob
import html
import json
import math
import os
import re
import time
from datetime import date
from urllib.parse import urlencode
from urllib.request import urlopen
from typing import Any

try:
    import pandas as pd
    from kenpompy import misc as kenpompy_misc
    from kenpompy.utils import get_html as kenpompy_get_html, login as kenpompy_login

    KENPOMPY_AVAILABLE = True
except ImportError:
    KENPOMPY_AVAILABLE = False


def normalize_text(raw_html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw_html)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def haversine_distance_miles(coord1: tuple[float, float], coord2: tuple[float, float]) -> float:
    radius_miles = 3958.8
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_miles * c


def compute_total_miles(games: list[dict[str, Any]]) -> int:
    sorted_games = sorted(games, key=lambda game: game["date"])
    total_miles = 0.0
    for index in range(1, len(sorted_games)):
        previous = sorted_games[index - 1]["coordinates"]
        current = sorted_games[index]["coordinates"]
        total_miles += haversine_distance_miles((previous[0], previous[1]), (current[0], current[1]))
    return round(total_miles)


def compute_most_common_teams(games: list[dict[str, Any]], top_n: int = 3) -> list[dict[str, Any]]:
    # In the source HTML, the first team listed in each game row is the winner,
    # which maps to homeTeam in the parsed game data.
    counts: collections.Counter[str] = collections.Counter()
    wins: dict[str, int] = {}
    losses: dict[str, int] = {}

    for game in games:
        home_team = game.get("homeTeam", {}).get("name")
        away_team = game.get("awayTeam", {}).get("name")
        if isinstance(home_team, str) and home_team:
            counts[home_team] += 1
            wins[home_team] = wins.get(home_team, 0) + 1
        if isinstance(away_team, str) and away_team:
            counts[away_team] += 1
            losses[away_team] = losses.get(away_team, 0) + 1

    return [
        {
            "name": name,
            "count": count,
            "record": {"wins": wins.get(name, 0), "losses": losses.get(name, 0)},
        }
        for name, count in counts.most_common(top_n)
    ]


def compute_days_worked_streak(games: list[dict[str, Any]]) -> int:
    unique_dates: set[date] = set()
    for game in games:
        raw_date = game.get("date")
        if not isinstance(raw_date, str):
            continue
        try:
            unique_dates.add(date.fromisoformat(raw_date))
        except ValueError:
            continue

    date_values = sorted(unique_dates)
    if not date_values:
        return 0

    max_streak = 1
    current_streak = 1

    for index in range(1, len(date_values)):
        previous_date = date_values[index - 1]
        current_date = date_values[index]
        if (current_date - previous_date).days == 1:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1

    return max_streak


def compute_current_days_worked_streak(games: list[dict[str, Any]]) -> int:
    unique_dates: set[date] = set()
    for game in games:
        raw_date = game.get("date")
        if not isinstance(raw_date, str):
            continue
        try:
            unique_dates.add(date.fromisoformat(raw_date))
        except ValueError:
            continue

    date_values = sorted(unique_dates)
    if not date_values:
        return 0

    current_streak = 1

    for index in range(len(date_values) - 1, 0, -1):
        current_date = date_values[index]
        previous_date = date_values[index - 1]
        if (current_date - previous_date).days == 1:
            current_streak += 1
        else:
            break

    return current_streak


def compute_favorite_partners(
    referees: list[dict[str, Any]], top_n: int = 3
) -> None:
    """Compute and attach the top ``top_n`` co-officiating partners for each
    referee.

    Algorithm (O(total_games)):

    1. Build a reverse index mapping each unique game key (date + home team +
       away team) to the list of referee IDs that officiated it.
    2. For each referee, walk their games, accumulate co-ref counts via the
       index, and keep the top ``top_n`` entries.
    """
    # Step 1: build game key → [referee_id, ...] index.
    game_to_refs: dict[str, list[str]] = {}
    for referee in referees:
        ref_id = referee["id"]
        for game in referee.get("games", []):
            date = game.get("date", "")
            home = game.get("homeTeam", {}).get("name", "")
            away = game.get("awayTeam", {}).get("name", "")
            key = f"{date}|{home}|{away}"
            game_to_refs.setdefault(key, []).append(ref_id)

    # Build id → name lookup for fast resolution.
    id_to_name = {ref["id"]: ref["name"] for ref in referees}

    # Step 2: for each referee, count co-refs and keep the top ``top_n``.
    for referee in referees:
        ref_id = referee["id"]
        co_ref_counts: collections.Counter[str] = collections.Counter()
        for game in referee.get("games", []):
            date = game.get("date", "")
            home = game.get("homeTeam", {}).get("name", "")
            away = game.get("awayTeam", {}).get("name", "")
            key = f"{date}|{home}|{away}"
            for co_ref_id in game_to_refs.get(key, []):
                if co_ref_id != ref_id:
                    co_ref_counts[co_ref_id] += 1

        referee["favoritePartners"] = [
            {"id": co_id, "name": id_to_name.get(co_id, co_id), "count": count}
            for co_id, count in co_ref_counts.most_common(top_n)
        ]


def geocode_location(
    location: str,
    api_key: str,
    cache: dict[str, list[float]],
) -> list[float]:
    cached = cache.get(location)
    if cached is not None:
        return cached

    query_string = urlencode({"address": location, "key": api_key})
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{query_string}"
    with urlopen(url, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    status = payload.get("status")
    if status != "OK":
        error_message = payload.get("error_message")
        details = f": {error_message}" if error_message else ""
        raise ValueError(f"Google Geocoding failed for '{location}' with status {status}{details}")

    results = payload.get("results")
    if not results:
        raise ValueError(f"Google Geocoding returned no results for '{location}'")

    location_data = results[0].get("geometry", {}).get("location", {})
    lat = location_data.get("lat")
    lng = location_data.get("lng")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        raise ValueError(f"Google Geocoding returned invalid coordinates for '{location}'")

    coordinates = [float(lat), float(lng)]
    cache[location] = coordinates
    time.sleep(0.05)
    return coordinates


def enrich_referees_with_mileage(
    referees: list[dict[str, Any]],
    api_key: str,
) -> None:
    cache: dict[str, list[float]] = {}

    for referee in referees:
        games = referee.get("games", [])
        for game in games:
            location = game.get("location")
            if not isinstance(location, str) or not location:
                raise ValueError(f"Invalid game location for referee {referee.get('id')}")
            coordinates = geocode_location(location, api_key, cache)
            game["coordinates"] = coordinates

        referee["totalMilesTravelled"] = compute_total_miles(games)
        referee["mostCommonTeams"] = compute_most_common_teams(games)
        referee["daysWorkedStreak"] = compute_days_worked_streak(games)
        referee["currentDaysWorkedStreak"] = compute_current_days_worked_streak(games)


def extract_referee_id(contents: str) -> str:
    match = re.search(r"referee\.php\?r=(\d+)", contents)
    if not match:
        raise ValueError("Could not find referee id (referee.php?r=...) in HTML")
    return match.group(1)


def extract_referee_name(contents: str) -> str:
    match = re.search(r"<h5[^>]*>(.*?)</h5>", contents, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError("Could not find referee name in <h5>")

    name_text = normalize_text(match.group(1))
    name_text = re.sub(r"^\d+\s+", "", name_text)
    if not name_text:
        raise ValueError("Referee name appears empty")
    return name_text


def extract_ratings_tbody(contents: str) -> str:
    match = re.search(
        r"<table[^>]*id=['\"]ratings-table['\"][^>]*>.*?<tbody>(.*?)</tbody>",
        contents,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        raise ValueError("Could not find ratings-table tbody")
    return match.group(1)


def parse_game_row(row_html: str) -> dict[str, Any] | None:
    cells = re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.IGNORECASE | re.DOTALL)
    if len(cells) < 5:
        return None

    date_match = re.search(r"fanmatch\.php\?d=(\d{4}-\d{2}-\d{2})", row_html)
    if not date_match:
        return None
    game_date = date_match.group(1)

    game_cell_html = cells[3]
    team_matches = re.findall(
        r"team\.php\?team=([^'\"&>]+)[^>]*>(.*?)</a>",
        game_cell_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if len(team_matches) < 2:
        return None

    _, home_team_html = team_matches[0]
    _, away_team_html = team_matches[1]

    home_team_name = normalize_text(home_team_html)
    away_team_name = normalize_text(away_team_html)

    location = normalize_text(cells[4])

    return {
        "date": game_date,
        "location": location,
        "homeTeam": {
            "name": home_team_name,
        },
        "awayTeam": {
            "name": away_team_name,
        },
    }


def parse_referee_html(contents: str) -> dict[str, Any]:
    referee_id = extract_referee_id(contents)
    referee_name = extract_referee_name(contents)
    tbody_html = extract_ratings_tbody(contents)

    row_matches = re.findall(r"<tr[^>]*>(.*?)</tr>", tbody_html, flags=re.IGNORECASE | re.DOTALL)
    games: list[dict[str, Any]] = []
    for row_html in row_matches:
        game = parse_game_row(row_html)
        if game is not None:
            games.append(game)

    return {
        "id": referee_id,
        "name": referee_name,
        "games": games,
    }


def parse_referee_file(file_path: str) -> dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as file:
        contents = file.read()
    return parse_referee_html(contents)


def parse_all_referees(input_dir: str) -> list[dict[str, Any]]:
    pattern = os.path.join(input_dir, "*.html")
    files = sorted(glob.glob(pattern))
    if not files:
        raise ValueError(f"No HTML files found in: {input_dir}")

    referees: list[dict[str, Any]] = []
    for path in files:
        try:
            referees.append(parse_referee_file(path))
        except ValueError as error:
            print(f"Skipping {os.path.basename(path)}: {error}")

    if not referees:
        raise ValueError(f"No parseable referee HTML files found in: {input_dir}")

    return referees


def fetch_referees_from_kenpompy(browser: Any) -> list[dict[str, Any]]:
    refs_df = kenpompy_misc.get_refs(browser)

    referees: list[dict[str, Any]] = []
    for _, row in refs_df.iterrows():
        ref_id = row["ID"]
        if pd.isna(ref_id):
            print(f"Skipping referee {str(row.get('Name', '(unknown)'))}: no ID found")
            continue
        url = f"https://kenpom.com/referee.php?r={int(ref_id)}"
        html_bytes = kenpompy_get_html(browser, url)
        contents = html_bytes.decode("utf-8") if isinstance(html_bytes, bytes) else str(html_bytes)
        try:
            referee = parse_referee_html(contents)
            referees.append(referee)
        except ValueError as error:
            print(f"Skipping referee {str(row.get('Name', ref_id))} ({int(ref_id)}): {error}")

    if not referees:
        raise ValueError("No referee data fetched from kenpom.com")

    return referees


def main() -> None:
    current_dir = os.path.dirname(__file__)

    parser = argparse.ArgumentParser(
        description="Parse referee HTML files into JSON with id, name, and games fields."
    )
    parser.add_argument(
        "--input-dir",
        default=current_dir,
        help="Directory containing referee HTML files (default: data)",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(current_dir, "referees.json"),
        help="Output JSON file path (default: data/referees.json)",
    )
    parser.add_argument(
        "--google-api-key",
        default=os.getenv("GOOGLE_GEOCODING_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY"),
        help=(
            "Google Geocoding API key. Defaults to GOOGLE_GEOCODING_API_KEY or "
            "GOOGLE_MAPS_API_KEY environment variable."
        ),
    )
    parser.add_argument(
        "--kenpompy-email",
        default=os.getenv("KENPOM_EMAIL"),
        help="Kenpom.com email for scraping via kenpompy. Defaults to KENPOM_EMAIL env var.",
    )
    parser.add_argument(
        "--kenpompy-password",
        default=os.getenv("KENPOM_PASSWORD"),
        help="Kenpom.com password for scraping via kenpompy. Defaults to KENPOM_PASSWORD env var.",
    )
    args = parser.parse_args()

    if not args.google_api_key:
        parser.error(
            "Missing Google API key. Provide --google-api-key or set GOOGLE_GEOCODING_API_KEY"
        )

    if args.kenpompy_email and args.kenpompy_password:
        if not KENPOMPY_AVAILABLE:
            parser.error(
                "kenpompy is not installed. Install it with: "
                "pip install git+https://github.com/rohitramkumar/kenpompy.git"
            )
        browser = kenpompy_login(args.kenpompy_email, args.kenpompy_password)
        referees = fetch_referees_from_kenpompy(browser)
    else:
        referees = parse_all_referees(args.input_dir)

    enrich_referees_with_mileage(referees, args.google_api_key)
    compute_favorite_partners(referees)

    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    payload = {
        "lastUpdated": date.today().isoformat(),
        "referees": referees,
    }

    with open(args.output, "w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, indent=2, ensure_ascii=False)

    print(f"Wrote {len(referees)} referees to {args.output}")


if __name__ == "__main__":
    main()