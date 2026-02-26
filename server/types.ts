export interface Team {
  name: string;
  location: string;
}

export interface Game {
  id: string;
  date: string;
  location: string;
  coordinates: [number, number]; // [lat, lng]
  homeTeam: Team;
  awayTeam: Team;
}

export interface TeamCount {
  name: string;
  count: number;
}

export interface Referee {
  id: string;
  name: string;
  games: Game[];
  totalMilesTravelled: number;
  mostCommonTeams: TeamCount[];
  daysWorkedStreak: number;
}

export interface RefereeListItem {
  id: string;
  name: string;
  gameCount: number;
}
