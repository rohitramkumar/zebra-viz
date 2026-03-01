import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { type RefereeListItem, type TeamCount } from "./types";
import { setupVite, serveStatic, log } from "./vite";
import { readFileSync } from "node:fs";

type RefereeSource = {
  id: string;
  name: string;
  totalMilesTravelled: number;
  mostCommonTeams: TeamCount[];
  daysWorkedStreak: number;
  games: {
    date: string;
    location: string;
    coordinates: [number, number];
    homeTeam: { name: string };
    awayTeam: { name: string };
  }[];
};

const referees = JSON.parse(
  readFileSync(new URL("../data/referees.json", import.meta.url), "utf-8"),
) as RefereeSource[];

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
    totalMilesTravelled: referee.totalMilesTravelled,
    mostCommonTeams: referee.mostCommonTeams,
    daysWorkedStreak: referee.daysWorkedStreak,
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
