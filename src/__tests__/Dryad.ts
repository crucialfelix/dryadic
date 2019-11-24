import Dryad from "../Dryad";

class TypeOne extends Dryad {}

describe("Dryad", function() {
  it("should clone", function() {
    const a = [1, 2, 3];
    const child = new TypeOne();
    const d = new TypeOne({ one: 1, two: a }, [child]);

    const cloned = d.clone();
    expect(cloned.constructor.name).toBe(d.constructor.name);
    expect(cloned.properties !== d.properties).toBe(true);
    expect(cloned.children !== d.children).toBe(true);
    expect(cloned.properties.two !== d.properties.two).toBe(true);
    expect(cloned.children[0] !== d.children[0]).toBe(true);
  });
});
