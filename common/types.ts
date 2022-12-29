export interface GameState {
  players: Player[];
  id: string;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}
export interface Player {
  id: string;
  x: number;
  y: number;
}
