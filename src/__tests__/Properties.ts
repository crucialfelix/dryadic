import { invertDryadicProperties } from "../Properties";
import Dryad from "../Dryad";
import dryadic from "../dryadic";

describe("Properties", function() {
  const propertiesSupplied = {
    prepareForAdd: null,
    add: null,
    remove: null,
  };

  class OwnerDryad extends Dryad {
    prepareForAdd() {
      return {
        run: (context, properties) => {
          propertiesSupplied.prepareForAdd = properties;
        },
      };
    }

    add() {
      return {
        run: (context, properties) => {
          propertiesSupplied.add = properties;
        },
      };
    }

    remove() {
      return {
        run: (context, properties) => {
          propertiesSupplied.remove = properties;
        },
      };
    }
  }

  class ValueDryad extends Dryad {
    value() {
      return 1;
    }
  }

  const c = new Dryad({ key: "value" });
  const d = new OwnerDryad({
    one: new ValueDryad(),
  });

  it("should return undefined if no dryads in properties", function() {
    const o = invertDryadicProperties(c);
    expect(o).toBeUndefined();
  });

  it("should return a Properties if dryad is in Properties", function() {
    const o = invertDryadicProperties(d);
    // void | Properties
    expect(o).toBeTruthy();
    // in this case it should always be a Properties
    if (o) {
      expect(o.constructor.name).toBe("Properties");
      const dp = o.children[0];
      expect(dp.constructor.name).toBe("ValueDryad");
      const pown = o.children[1];
      expect(pown.constructor.name).toBe("PropertiesOwner");
      const src = pown.children[0];
      expect(src.constructor.name).toBe("OwnerDryad");
      const fn = src.properties.one;
      expect(typeof fn).toBe("function");
    }
  });

  describe("getting value in child", function() {
    beforeEach(() => {
      propertiesSupplied.prepareForAdd = null;
      propertiesSupplied.add = null;
      propertiesSupplied.remove = null;
    });

    it("in prepareForAdd", function() {
      const properties = invertDryadicProperties(d);
      expect(properties).toBeTruthy();
      if (properties) {
        const p = dryadic(properties);
        return p.prepare().then(() => {
          expect(propertiesSupplied.prepareForAdd).toEqual({ one: 1 });
        });
      }
      return;
    });

    it("in add", function() {
      const properties = invertDryadicProperties(d);
      expect(properties).toBeTruthy();
      if (properties) {
        const p = dryadic(properties);

        return p.play().then(() => {
          expect(propertiesSupplied.add).toEqual({ one: 1 });
        });
      }
      return;
    });

    it("in remove", function() {
      const properties = invertDryadicProperties(d);
      expect(properties).toBeTruthy();
      if (properties) {
        const p = dryadic(properties);

        return p.play().then(() => {
          return p.stop().then(() => {
            expect(propertiesSupplied.remove).toEqual({ one: 1 });
          });
        });
      }
      return;
    });
  });

  describe("grandparent context accessible by children", function() {
    class ParentDryad extends Dryad {
      initialContext() {
        return {
          urvalue: 0,
        };
      }
    }

    const s = new ParentDryad({}, [
      new Dryad({
        key: new ValueDryad(),
      }),
    ]);

    it("should supply parent context to children ", function() {
      const p = dryadic(s);
      const state = p.getDebugState();

      const properties = state.children ? state.children[0] : undefined;
      // const valueDryad = properties.children[0];
      const parent = properties ? properties.children[1].children[0] : undefined;
      expect(properties).toBeDefined();
      expect(parent).toBeDefined();
      if (properties && parent) {
        const context = p.tree ? p.tree.getContext(parent.id) : undefined;
        expect(context && context.urvalue).toBe(0);
      }
    });
  });
});
