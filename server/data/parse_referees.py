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
    counts: collections.Counter[str] = collections.Counter()
    for game in games:
        home_team = game.get("homeTeam", {}).get("name")
        away_team = game.get("awayTeam", {}).get("name")
        if isinstance(home_team, str) and home_team:
            counts[home_team] += 1
        if isinstance(away_team, str) and away_team:
            counts[away_team] += 1

    return [{"name": name, "count": count} for name, count in counts.most_common(top_n)]


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


def parse_referee_file(file_path: str) -> dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as file:
        contents = file.read()

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


def main() -> None:
    current_dir = os.path.dirname(__file__)

    parser = argparse.ArgumentParser(
        description="Parse referee HTML files into JSON with id, name, and games fields."
    )
    parser.add_argument(
        "--input-dir",
        default=current_dir,
        help="Directory containing referee HTML files (default: server/data)",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(current_dir, "referees.json"),
        help="Output JSON file path (default: server/data/referees.json)",
    )
    parser.add_argument(
        "--google-api-key",
        default=os.getenv("GOOGLE_GEOCODING_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY"),
        help=(
            "Google Geocoding API key. Defaults to GOOGLE_GEOCODING_API_KEY or "
            "GOOGLE_MAPS_API_KEY environment variable."
        ),
    )
    args = parser.parse_args()

    if not args.google_api_key:
        parser.error(
            "Missing Google API key. Provide --google-api-key or set GOOGLE_GEOCODING_API_KEY"
        )

    referees = parse_all_referees(args.input_dir)
    enrich_referees_with_mileage(referees, args.google_api_key)

    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as output_file:
        json.dump(referees, output_file, indent=2, ensure_ascii=False)

    print(f"Wrote {len(referees)} referees to {args.output}")


if __name__ == "__main__":
    main()