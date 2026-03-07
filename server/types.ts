export interface Team {
  name: string;
}

export interface Game {
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

export interface RefereePartner {
  id: string;
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
  favoritePartners: RefereePartner[];
}

export interface RefereeListItem {
  id: string;
  name: string;
  gameCount: number;
}

export interface RefereeListResponse {
  lastUpdated: string;
  referees: RefereeListItem[];
}
