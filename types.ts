
export interface MatchState {
  teamA: {
    name: string;
    score: number;
    color: string;
  };
  teamB: {
    name: string;
    score: number;
    color: string;
  };
  matchTitle: string;
  lastUpdated: number;
}

export enum AppMode {
  SETUP = 'SETUP',
  BOARD = 'BOARD',
  REMOTE = 'REMOTE'
}
