import Dryad from "../Dryad";
import DryadTree from "../DryadTree";
import DryadPlayer from "../DryadPlayer";
import layer from "../layer";
import { makeApp } from "./_testUtils";

class TypeOne extends Dryad {
  // for testing Dryads in properties
  value(): number {
    return 1;
  }
}

class TypeTwo extends Dryad {}

class HasSubgraph extends Dryad {
  subgraph() {
    return new TypeOne({}, [new TypeTwo()]);
  }
}

class HasSubgraphWithSelf extends Dryad {
  subgraph() {
    // rendering self as a child of another
    return new TypeOne({}, [this]);
  }
}

class Parent extends Dryad {}
class Child extends Dryad {
  requireParent() {
    return "Parent";
  }
}

describe("DryadTree", function() {
  it("should construct", function() {
    const root = new TypeOne({}, [new TypeTwo()]);
    const tree = new DryadTree(root);

    expect(tree.root).toBe(root);
    expect(Object.keys(tree.dryads).length).toBe(2);
    expect(Object.keys(tree.contexts).length).toBe(2);

    expect(tree.tree).toBeDefined();
    if (tree.tree) {
      expect(tree.tree.dryadType).toBe("TypeOne");
      expect(tree.tree.children.length).toBe(1);
      expect(tree.tree.children[0].id).toBe("0.0");
      expect(tree.tree.children[0].dryadType).toBe("TypeTwo");
    }
  });

  it("should walk", function() {
    const root = new TypeOne({}, [new TypeTwo()]);
    const tree = new DryadTree(root);

    let count = 0;
    tree.walk((/*dryad, context, node*/) => {
      count += 1;
    });

    expect(count).toBe(2);
  });

  it("should create context with parent as Prototype so parent properties are accessible", function() {
    const root = new TypeOne({}, [new TypeTwo()]);
    const tree = new DryadTree(root);
    expect(tree.tree).toBeDefined();
    if (tree.tree) {
      const rootId = tree.tree.id;
      const childId = tree.tree.children[0].id;

      tree.updateContext(rootId, { changed: "value" });
      expect(tree.contexts[childId].changed).toBe("value");
    }
  });

  it("should make tree with subgraph", function() {
    const root = new HasSubgraph();
    const tree = new DryadTree(root);

    // 3 not 2 ?
    // because the parent is registered twice with two different ids
    // even though it only appears in the tree once
    expect(Object.keys(tree.dryads).length).toBe(3);
    expect(tree.tree).toBeDefined();
    if (tree.tree) {
      expect(tree.tree.children.length).toBe(1);
      expect(tree.tree.children[0].dryadType).toBe("TypeTwo");
    }
  });

  it("should make tree with subgraph with self as a new child", function() {
    const root = new HasSubgraphWithSelf();
    const tree = new DryadTree(root);

    expect(Object.keys(tree.dryads).length).toBe(3);
    expect(tree.tree).toBeDefined();
    if (tree.tree) {
      expect(tree.tree.dryadType).toBe("TypeOne");
      expect(tree.tree.children.length).toBe(1);
      expect(tree.tree.children[0].dryadType).toBe("HasSubgraphWithSelf");
    }
  });

  /**
   * You can only do requireParent if the classes are registered
   * by name with the DryadPlayer / app.
   */
  describe("required parent", function() {
    it("Child should be wrapped in required Parent", function() {
      const app = makeApp([Child, Parent, TypeOne]);
      const root = new Child({}, [new TypeOne()]);
      app.setRoot(root);
      const tree = app.tree;
      expect(tree && tree.tree).toBeDefined();
      if (tree && tree.tree) {
        expect(tree.tree.children.length).toBe(1);
        const child = tree.tree.children[0];
        expect(child.dryadType).toBe("Child");
        expect(child.children[0].dryadType).toBe("TypeOne");
      }
    });

    it("should not wrap a dryad in a required parent if already present in branch", function() {
      const app = makeApp([Child, Parent, TypeOne]);
      const root = new Parent({}, [new Child({}, [new TypeOne()])]);
      app.setRoot(root);
      const tree = app.tree;
      expect(tree && tree.tree).toBeDefined();
      if (tree && tree.tree) {
        const child = tree.tree.children[0];
        expect(child.dryadType).toBe("Child");
        expect(child.children[0].dryadType).toBe("TypeOne");
      }
    });
  });

  describe("Dryads in properties", function() {
    const app = makeApp([Child, Parent, TypeOne]);
    const root = new Parent({ key: new TypeOne() }, []);
    app.setRoot(root);
    const treeRoot = app.tree && app.tree.tree;

    it("should invert Dryads in properties as a Properties dryad", function() {
      expect(treeRoot).toBeDefined();
      if (treeRoot) {
        expect(treeRoot.dryadType).toBe("Properties");

        const child = treeRoot.children[0];
        expect(child.dryadType).toBe("TypeOne");

        // PropertiesOwner({...}, [Parent])
        const source = treeRoot.children[1].children[0];
        expect(source.dryadType).toBe("Parent");

        // returns the value that TypeOne returns
        const propertyAccessor = source.dryad.properties.key;
        expect(typeof propertyAccessor).toBe("function");
        // Cannot read propertiesValues
        // you need context
        // const result = propertyAccessor();
        // expect(result).toBe(1);
      }
    });
  });

  // describe('prepareForAdd can be a function', function() {
  //
  //   const value = 'value';
  //
  //   class ParentWithPrepareFn extends Dryad {
  //     prepareForAdd() {
  //       return {
  //         one: (context) => {
  //           if (!context) {
  //             throw new Error('no context supplied to prepareForAdd inner function');
  //           }
  //           return value;
  //         },
  //         two: value
  //       };
  //     }
  //   }
  //
  //   class Inner extends Dryad {}
  //
  //   it('should call fn and save to context', function() {
  //     const root = new ParentWithPrepareFn({}, [new Inner({})]);
  //     const app = new DryadPlayer(root);
  //
  //     return app.play().then(() => {
  //       const tree = app.tree;
  //       const rootId = tree.tree.id;
  //       const childId = tree.tree.children[0].id;
  //
  //       // root context should have one two = 'value'
  //       expect(tree.contexts[rootId].one).toBe(value);
  //       expect(tree.contexts[rootId].two).toBe(value);
  //       // child context should have those also
  //       expect(tree.contexts[childId].one).toBe(value);
  //       expect(tree.contexts[childId].two).toBe(value);
  //     });
  //   });
  // });

  describe("collectCommands", function() {
    it("should include properties", function() {
      const app = makeApp([Child, Parent, TypeOne]);
      const root = new Parent({ key: new TypeOne() }, []);
      app.setRoot(root);
      expect(app.tree && app.tree.tree).toBeDefined();
      if (app.tree && app.tree.tree) {
        // this is the top level command
        const cmds = app.tree.collectCommands("add", app.tree.tree, app);
        // get the Parent which is now the the child of the last child of the Properties (the play graph root)
        // console.log({cmds});
        const parentCmd = cmds.children[1].children[0];
        // console.log({parentCmd});

        expect(parentCmd.properties).toBeDefined();
        expect(typeof parentCmd.properties.key).toBe("function");
        // that when evaluated with produces the number 1
        // but only after you have executed the tree
      }
    });
  });

  describe("makeCommandTree", function() {
    it("should make a command tree given a single command", function() {
      const root = new Dryad();
      const app = new DryadPlayer(root, [layer]);
      const tree = app.tree;
      expect(tree && tree.tree).toBeDefined();
      if (tree && tree.tree) {
        const rootId = tree.tree.id;
        let ran = false;
        const commands = {
          run: () => (ran = true),
        };
        const ctree = tree.makeCommandTree(rootId, commands);
        expect(ctree.commands).toBe(commands);
        expect(app.middleware.middlewares.length).toBeTruthy();

        return app._call(ctree, "stateTransitionName").then(() => {
          expect(ran).toBe(true);
        });
      }
      return;
    });
  });

  describe("updateContext", function() {
    let tree, dryadId;
    beforeEach(() => {
      const root = new Dryad();
      const app = new DryadPlayer(root, [layer]);
      tree = app.tree;
      dryadId = tree.tree && tree.tree.id;
    });

    it("should set a top level value on context", function() {
      tree.updateContext(dryadId, { key: "value" });
      const c = tree.contexts[dryadId];
      expect(c.key).toBe("value");
    });

    it("should set an object", function() {
      const obj = {
        sub: "value",
      };

      tree.updateContext(dryadId, { obj: obj });
      const c = tree.contexts[dryadId];
      expect(c.obj.sub).toBe("value");
    });

    it("should replace a sub object", function() {
      const obj = {
        sub: "value",
      };

      tree.updateContext(dryadId, { obj: obj });
      tree.updateContext(dryadId, {
        obj: {
          sub2: "value2",
        },
      });

      const c = tree.contexts[dryadId];
      expect(c.obj.sub).toBeUndefined();
      expect(c.obj.sub2).toBe("value2");
    });

    it("should remove an object if it is set to undefined", function() {
      /**
       * Removing a top level object.
       * Could explicitly delete the key but for now just set it to undefined
       * if you need to remove something.
       */
      const obj = {
        sub: "value",
        sub2: "value2",
      };
      const obj2 = {
        other: "thing",
      };

      tree.updateContext(dryadId, { obj, obj2 });
      tree.updateContext(dryadId, { obj: undefined, obj2 });
      const c = tree.contexts[dryadId];
      expect(c.obj).toBeUndefined();
      expect(c.obj2).toBe(obj2);
    });
  });
});
