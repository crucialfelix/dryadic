import Dryad from "../Dryad";
import DryadPlayer from "../DryadPlayer";
import layer from "../layer";

class TypeOne extends Dryad {
  prepareForAdd() {
    return {
      updateContext: (/*context, props*/) => {
        return {
          // this is not flattened/dereferenced. should it be?
          // Promise.resolve("something")
          something: "something",
        };
      },
    };
  }

  add() {
    return {
      run: () => {
        return Promise.resolve();
      },
    };
  }
}

class Child extends Dryad {}

// class PrepareWithFunction extends Dryad {
//   /**
//    * should resolve with or without a function
//    */
//   prepareForAdd() {
//     return {
//       updateContext: (/*context, props*/) => {
//         return {
//           one: 1,
//           two: Promise.resolve(2)
//         };
//       }
//     };
//   }
// }

describe("DryadPlayer", function() {
  let root: Dryad;
  let player: DryadPlayer;

  beforeEach(() => {
    root = new TypeOne({}, [new Child()]);
    player = new DryadPlayer(root);
  });

  describe("constructor", function() {
    it("should construct", function() {
      expect(player).toBeTruthy();
    });
  });

  describe("register class", function() {
    it("should have registered TypeOne", function() {
      player.addClass(TypeOne);
      expect(player.classes["typeone"]).toBeTruthy();
    });
  });

  describe("play", function() {
    it("should play", function() {
      return player.play();
    });
  });

  describe("prepare", function() {
    it("should update context on prepareForAdd", function() {
      return player.prepare().then(() => {
        const tree = player.tree;
        expect(tree && tree.tree).toBeDefined();
        if (tree && tree.tree) {
          const rootId = tree.tree.id;
          const childId = tree.tree.children[0].id;

          const rootContext = tree.contexts[rootId];
          const childContext = tree.contexts[childId];

          console.log(rootContext);
          console.log(childContext);

          expect(rootContext.something).toBe("something");
          expect(childContext.something).toBe("something");
        }
      });
    });

    // describe('prepareForAdd with function', function() {
    //   const root;
    //   const player;
    //
    //   beforeEach(() => {
    //     root = new PrepareWithFunction();
    //     player = new DryadPlayer(root);
    //   });
    //
    //   it('should update context on prepareForAdd if that returns a function', function() {
    //     return player.play().then(() => {
    //       let rootId = player.tree.tree.id;
    //       expect(player.tree.contexts[rootId].one).toBe(1);
    //       expect(player.tree.contexts[rootId].two).toBe(2);
    //     });
    //   });
    // });
  });

  describe("stop", function() {
    it("should stop", function() {
      return player.stop();
    });
  });

  describe("setRoot", function() {
    it("should setRoot", function() {
      player.setRoot(root);
      expect(player.tree).toBeTruthy();
    });
  });

  describe("callCommand", function() {
    let ran = false;

    class CallsRuntimeCommand extends Dryad {
      add(pl) {
        return {
          run: context => {
            pl.callCommand(context.id, {
              // context === innerContext
              run: innerContext => {
                // should execute this
                if (context.id !== innerContext.id) {
                  // console.error('context', context, innerContext);
                  throw new Error("context and innerContext id do not match");
                }
                ran = true;
              },
            });
          },
        };
      }
    }

    it("should execute a command object via context.callCommand", function() {
      const r = new CallsRuntimeCommand();
      const p = new DryadPlayer(r, [layer]);
      return p.play().then(() => {
        expect(ran).toBe(true);
      });
    });

    it("should set context.callCommand in children", function() {
      const r = new Dryad({}, [new CallsRuntimeCommand()]);
      const p = new DryadPlayer(r, [layer]);
      return p.play().then(() => {
        expect(ran).toBe(true);
      });
    });

    // implement this test when you have implemented .update
    // it('should execute context.callCommand for any Dryad added by .add', function() {
    //   const root = new CallsRuntimeCommand();
    //   const player = new DryadPlayer(root, [layer]);
    //   return player.play().then(() => {
    //     expect(ran).toBe(true);
    //   });
    //
    // });
  });

  // it('on prepare should update context of parent so child sees it', function() {
  //   return player.play().then(() => {
  //     const rootId = player.tree.tree.id;
  //     const childId = player.tree.tree.children[0].id;
  //
  //   });
  // });
});
