export interface GameState {
  players: { x: number; y: number; id: string }[];
  id: string;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}
