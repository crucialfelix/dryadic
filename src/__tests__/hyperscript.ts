import hyperscript from "../hyperscript";
import Dryad from "../Dryad";

class GenericDryad extends Dryad {}

function lookupClassByNameFn(className) {
  if (className === GenericDryad.name.toLowerCase()) {
    return GenericDryad;
  }
  throw new Error("Unexpected className: " + className);
}

describe("hyperscript", function() {
  it("should pass a Dryad through", function() {
    const input = new GenericDryad();
    const output = hyperscript(input, lookupClassByNameFn);
    expect(output).toBe(input);
  });

  it("should create a Dryad from supplying the class", function() {
    const input = [GenericDryad, { key: "value" }, []];
    const output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({ key: "value" });
    expect(output.children).toEqual([]);
  });

  it("should create a Dryad from 3 args", function() {
    const input = ["genericdryad", { key: "value" }, []];
    const output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({ key: "value" });
    expect(output.children).toEqual([]);
  });

  it("should create a Dryad from 2 args", function() {
    const input = ["genericdryad", []];
    const output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({});
    expect(output.children).toEqual([]);
  });

  it("should create a Dryad from 1 arg", function() {
    const input = ["genericdryad"];
    const output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({});
    expect(output.children).toEqual([]);
  });

  it("should create Dryad for children", function() {
    const input = ["genericdryad", [["genericdryad", {}, []]]];
    const output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({});
    expect(output.children.length).toEqual(1);
    expect(output.children[0].isDryad).toBeTruthy();
  });

  it("should create Dryads from properties that look like hyperscript forms ", function() {
    const input = [
      "genericdryad",
      {
        key: ["genericdryad", {}, []],
      },
    ];

    const output = hyperscript(input, lookupClassByNameFn);
    expect(output.properties.key).toBeDefined();
    expect(output.properties.key.isDryad).toBe(true);
  });
});
