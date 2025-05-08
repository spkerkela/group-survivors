export interface State<T> {
  update(dt: number, data: T): State<T>;
  enter?(data?: T): void;
  exit?(data?: T): void;
}

export default class StateMachine<T> {
  state: State<T>;
  constructor(firstState: State<T>, data: T) {
    this.state = firstState;
    this.state.enter?.(data);
  }
  update(dt: number, data: T): void {
    const newState = this.state.update(dt, data);
    if (newState !== this.state) {
      this.state.exit?.(data);
      newState.enter?.(data);
      this.state = newState;
    }
  }
}
