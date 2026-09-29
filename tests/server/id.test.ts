import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateId } from "../../server/id-generator";

describe("id-generator", () => {
  it("should generate an id with the given prefix", () => {
    assert.match(generateId("test"), /^test-/);
  });
});
