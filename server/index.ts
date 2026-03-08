import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { type RefereeListItem, type TeamCount, type RefereePartner } from "./types";
import { setupVite, serveStatic, log } from "./vite";
import { readFileSync } from "node:fs";

type RefereeSource = {
  id: string;
  name: string;
  totalMilesTravelled: number;
  mostCommonTeams: TeamCount[];
  daysWorkedStreak: number;
  favoritePartners?: RefereePartner[];
  games: {
    date: string;
    location: string;
    coordinates: [number, number];
    homeTeam: { name: string };
    awayTeam: { name: string };
  }[];
};

const refereeData = JSON.parse(
  readFileSync(new URL("../data/referees.json", import.meta.url), "utf-8"),
) as { lastUpdated: string; referees: RefereeSource[] };

const { lastUpdated, referees: rawReferees } = refereeData;

/**
 * Computes the top 3 co-officiating partners for each referee.
 *
 * Algorithm (O(total_games)):
 * 1. Build a reverse index mapping each unique game key to the list of referee
 *    IDs who officiated it.
 * 2. For each referee, walk their games, accumulate co-ref counts from the
 *    index, and keep the top 3 by count.
 */
function computeFavoritePartners(referees: RefereeSource[]): Map<string, RefereePartner[]> {
  // Step 1: build game key → [refereeId, ...] index.
  const gameToRefs = new Map<string, string[]>();
  for (const referee of referees) {
    for (const game of referee.games) {
      const key = `${game.date}|${game.homeTeam.name}|${game.awayTeam.name}`;
      const ids = gameToRefs.get(key);
      if (ids) {
        ids.push(referee.id);
      } else {
        gameToRefs.set(key, [referee.id]);
      }
    }
  }

  // Build id → name lookup for fast resolution.
  const idToName = new Map<string, string>(referees.map((r) => [r.id, r.name]));

  // Step 2: for each referee, count co-refs and take the top 3.
  const result = new Map<string, RefereePartner[]>();
  for (const referee of referees) {
    const coRefCounts = new Map<string, number>();
    for (const game of referee.games) {
      const key = `${game.date}|${game.homeTeam.name}|${game.awayTeam.name}`;
      const ids = gameToRefs.get(key);
      if (!ids) continue;
      for (const coRefId of ids) {
        if (coRefId === referee.id) continue;
        coRefCounts.set(coRefId, (coRefCounts.get(coRefId) ?? 0) + 1);
      }
    }

    const top3: RefereePartner[] = Array.from(coRefCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, name: idToName.get(id) ?? id, count }));

    result.set(referee.id, top3);
  }

  return result;
}

const favoritePartnersMap = computeFavoritePartners(rawReferees);

// Attach pre-computed favoritePartners to each referee (only if not already
// present in the JSON, to support future data refreshes that include it).
const referees: RefereeSource[] = rawReferees.map((r) => ({
  ...r,
  favoritePartners: r.favoritePartners ?? favoritePartnersMap.get(r.id) ?? [],
}));

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
  res.json({ lastUpdated, referees: refereeList });
});

app.get("/api/referees/:id", (req, res) => {
  const referee = referees.find((r) => r.id === req.params.id);
  if (!referee) {
    return res.status(404).json({ error: "Referee not found" });
  }
  return res.json({
    ...referee,
    totalMilesTravelled: referee.totalMilesTravelled,
    mostCommonTeams: referee.mostCommonTeams,
    daysWorkedStreak: referee.daysWorkedStreak,
    currentDaysWorkedStreak: referee.currentDaysWorkedStreak,
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
