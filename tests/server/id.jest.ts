import { generateId } from "../../server/id-generator";

describe("id-generator", () => {
  it("should generate an id with the given prefix", () => {
    expect(generateId("test")).toMatch(/^test-/);
  });
});
