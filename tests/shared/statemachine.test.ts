import assert from "node:assert/strict";
import { describe, it } from "node:test";
import StateMachine, { type State } from "../../common/StateMachine";

class FirstState implements State<number> {
  update(dt: number, data: number): State<number> {
    data += 1;

    if (data > 2) {
      return new SecondState();
    }
    return this;
  }
}

class SecondState implements State<number> {
  calledEnter = false;
  calledExit = false;
  update(dt: number, data: number): State<number> {
    if (data > 10) {
      return new FirstState();
    }
    return this;
  }
  enter(data?: number): void {
    this.calledEnter = true;
  }
  exit(data?: number): void {
    this.calledExit = true;
  }
}

describe("StateMachine", () => {
  it("should set state to initial state", () => {
    const sm = new StateMachine<number>(new FirstState(), 0);
    assert.ok(sm.state instanceof FirstState);
  });
  it("should transition to second state", () => {
    const sm = new StateMachine<number>(new FirstState(), 0);
    sm.update(0, 2);
    assert.ok(sm.state instanceof SecondState);
  });
  it("should transition back to first state", () => {
    const sm = new StateMachine<number>(new FirstState(), 0);
    sm.update(0, 2);
    sm.update(0, 11);
    assert.ok(sm.state instanceof FirstState);
  });
  it("should call enter on second state", () => {
    const sm = new StateMachine<number>(new FirstState(), 0);
    sm.update(0, 2);
    assert.equal((sm.state as SecondState).calledEnter, true);
  });
  it("should call exit on second state", () => {
    const sm = new StateMachine<number>(new FirstState(), 0);
    sm.update(0, 2);
    const state = sm.state as SecondState;
    sm.update(0, 11);
    assert.equal(state.calledExit, true);
  });
});
