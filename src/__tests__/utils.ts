import isObject from "lodash/isObject";
import size from "lodash/size";

import Dryad from "../Dryad";
import { isDryad, mapProperties } from "../utils";

// describe('flattenProperties', function() {
//   const sub = new Dryad({});
//   const input = {
//     int: 2,
//     dict: {
//       key: 'value',
//       dryad: sub
//     }
//   };
//
//   const output = utils.flattenProperties(input);
//
//   it('a Dryad to be identified as such', function() {
//     expect(isObject(sub)).toBeTruthy();
//     expect(sub.isDryad).toBeTruthy();
//   });
//
//   it('should return a dict', function() {
//     expect(isObject(output)).toBe(true);
//   });
//
//   it('should have 3 entries', function() {
//     expect(size(output)).toEqual(3);
//   });
//
//   it('should have dict.key', function() {
//     expect(output['dict.key']).toBeDefined();
//   });
//
//   it('should include the sub Dryad', function() {
//     expect(output['dict.dryad']).toBeDefined();
//     expect(output['dict.dryad']).toBe(sub);
//   });
//
// });

describe("mapProperties", function() {
  const sub = new Dryad({});
  const input = {
    int: 2,
    dict: {
      key: "v",
      dryad: sub,
    },
    list: [1, 2, 3],
    // freq: ['synth', {lfo: 3}, []]
  };
  const longKeys: string[] = [];

  const setter = (value, key, longKey) => {
    // console.log('setter args', value, key, longKey);
    longKeys.push(longKey);
    return isDryad(value) ? "is a dryad" : "is a value";
  };

  const output = mapProperties(input, setter);
  // console.log('output', output);

  it("a Dryad to be identified as such", function() {
    expect(isObject(sub)).toBeTruthy();
    expect(sub.isDryad).toBeTruthy();
  });

  it("should return a dict", function() {
    expect(isObject(output)).toBe(true);
  });

  it("should have 3 top level entries", function() {
    expect(size(output)).toEqual(3);
  });

  it("should have dict.key", function() {
    expect(output.dict.key).toBeDefined();
    expect(output.dict.key).toBe("is a value");
  });

  it("should include the sub Dryad", function() {
    expect(output.dict.dryad).toBeDefined();
    expect(output.dict.dryad).toBe("is a dryad");
  });

  it("should have pushed 3 long keys", function() {
    expect(longKeys.length).toBe(3);
  });

  it("should have a list at .list", function() {
    expect(output.list).toEqual([1, 2, 3]);
  });

  // it('should pass a dryadic form through', function() {
  //   // maybe I shouldn't be using the same mapProperties function for this
  //   expect(output.freq).toBeDefined();
  //   expect(output.freq).toBe(['synth', {lfo: 3}, []]);
  // });

  // describe('passing a dryadic form', function() {
  //   const props = {
  //     key: ['genericdryad', {}, []]
  //   };
  //   const output = utils.mapProperties(props)
  // });
});
