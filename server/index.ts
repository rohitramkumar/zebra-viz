import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { type RefereeListItem, type TeamCount } from "./types";
import { setupVite, serveStatic, log } from "./vite";
import { readFileSync } from "node:fs";

type RefereeSource = {
  id: string;
  name: string;
  totalMilesTravelled?: number;
  games: {
    date: string;
    location: string;
    coordinates: [number, number];
    homeTeam: { name: string };
    awayTeam: { name: string };
  }[];
};

const referees = JSON.parse(
  readFileSync(new URL("./data/referees.json", import.meta.url), "utf-8"),
) as RefereeSource[];

function haversineDistanceMiles(coord1: [number, number], coord2: [number, number]): number {
  const R = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeTotalMiles(games: { coordinates: [number, number]; date: string }[]): number {
  const sorted = [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += haversineDistanceMiles(sorted[i - 1].coordinates, sorted[i].coordinates);
  }
  return Math.round(total);
}

function computeMostCommonTeams(
  games: { homeTeam: { name: string }; awayTeam: { name: string } }[],
  topN = 3
): TeamCount[] {
  const counts: Record<string, number> = {};
  for (const game of games) {
    const home = game.homeTeam.name;
    const away = game.awayTeam.name;
    counts[home] = (counts[home] ?? 0) + 1;
    counts[away] = (counts[away] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

function computeDaysWorkedStreak(games: { date: string }[]): number {
  const dates = Array.from(new Set(games.map((g) => g.date))).sort();
  if (dates.length === 0) return 0;
  let maxStreak = 1;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]).getTime();
    const curr = new Date(dates[i]).getTime();
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (Math.round(diffDays) === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }
  return maxStreak;
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.get("/api/referees", (_req, res) => {
  const refereeList: RefereeListItem[] = referees.map((ref) => ({
    id: ref.id,
    name: ref.name,
    gameCount: ref.games.length,
  }));
  res.json(refereeList);
});

app.get("/api/referees/:id", (req, res) => {
  const referee = referees.find((r) => r.id === req.params.id);
  if (!referee) {
    return res.status(404).json({ error: "Referee not found" });
  }
  return res.json({
    ...referee,
    totalMilesTravelled: referee.totalMilesTravelled ?? computeTotalMiles(referee.games),
    mostCommonTeams: computeMostCommonTeams(referee.games),
    daysWorkedStreak: computeDaysWorkedStreak(referee.games),
  });
});

const server = createServer(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

(async () => {
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000 or the PORT env variable.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
