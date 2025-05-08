import QuadTree from "../../common/QuadTree";

describe("Quadtree", () => {
  it("should create a quadtree", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 5);
    expect(qt).toBeTruthy();
  });

  it("should insert an object", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 3);
    expect(qt.insert({ x: 50, y: 50 })).toBeTruthy();
  });

  it("should retrieve an object", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 3);
    qt.insert({ x: 50, y: 50 });
    expect(qt.retrieve({ x: 50, y: 50, width: 1, height: 1 })).toHaveLength(1);
  });
  it("should not retrieve an object outside bounds", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 3);
    qt.insert({ x: 50, y: 50 });
    expect(qt.retrieve({ x: 150, y: 150, width: 1, height: 1 })).toHaveLength(
      0,
    );
  });
  it("should retrieve multiple objects", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 3);
    qt.insert({ x: 50, y: 50 });
    qt.insert({ x: 50, y: 50 });
    qt.insert({ x: 50, y: 50 });
    expect(qt.retrieve({ x: 50, y: 50, width: 1, height: 1 })).toHaveLength(3);
  });
  it("should retrieve only objects in bounds", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 3);
    qt.insert({ x: 10, y: 10 });

    qt.insert({ x: 50, y: 50 });
    qt.insert({ x: 51, y: 51 });
    qt.insert({ x: 52, y: 52 });

    qt.insert({ x: 60, y: 60 });
    expect(qt.retrieve({ x: 49, y: 49, width: 3, height: 3 })).toHaveLength(3);
  });
  it("should retrieve from multiple child nodes", () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 60, height: 60 }, 1);
    qt.insert({ x: 10, y: 10 });
    qt.insert({ x: 50, y: 50 });
    qt.insert({ x: 10, y: 50 });
    qt.insert({ x: 50, y: 50 });
    expect(qt.retrieve({ x: 9, y: 9, width: 51, height: 51 })).toHaveLength(4);
  });
});
