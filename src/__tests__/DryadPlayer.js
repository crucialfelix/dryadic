

var Dryad = require('../Dryad').default;
var DryadPlayer = require('../DryadPlayer').default;
var layer = require('../layer').default;

class TypeOne extends Dryad {

  prepareForAdd() {
    return {
      updateContext: (/*context, props*/) => {
        return {
          something: Promise.resolve('something')
        };
      }
    };
  }

  add() {
    return {
      run: () => {
        return Promise.resolve();
      }
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

describe('DryadPlayer', function() {

  var root;
  var player;

  beforeEach(() => {
    root = new TypeOne({}, [new Child()]);
    player = new DryadPlayer(root);
  });

  describe('constructor', function() {
    it('should construct', function() {
      expect(player).toBeTruthy();
    });
  });

  describe('register class', function() {
    it('should have registered TypeOne', function() {
      player.addClass(TypeOne);
      expect(player.classes['typeone']).toBeTruthy();
    });
  });

  describe('play', function() {
    pit('should play', function() {
      return player.play();
    });
  });

  describe('prepare', function() {
    pit('should update context on prepareForAdd', function() {
      return player.prepare().then(() => {
        let rootId = player.tree.tree.id;
        let childId = player.tree.tree.children[0].id;

        expect(player.tree.contexts[rootId].something).toBe('something');
        expect(player.tree.contexts[childId].something).toBe('something');
      });
    });

    // describe('prepareForAdd with function', function() {
    //   var root;
    //   var player;
    //
    //   beforeEach(() => {
    //     root = new PrepareWithFunction();
    //     player = new DryadPlayer(root);
    //   });
    //
    //   pit('should update context on prepareForAdd if that returns a function', function() {
    //     return player.play().then(() => {
    //       let rootId = player.tree.tree.id;
    //       expect(player.tree.contexts[rootId].one).toBe(1);
    //       expect(player.tree.contexts[rootId].two).toBe(2);
    //     });
    //   });
    // });
  });

  describe('stop', function() {
    pit('should stop', function() {
      return player.stop();
    });
  });

  describe('setRoot', function() {


    it('should setRoot', function() {
      player.setRoot(root);
      expect(player.tree).toBeTruthy();
    });
  });

  describe('callCommand', function() {

    let ran = false;

    class CallsRuntimeCommand extends Dryad {
      add(pl) {
        return {
          run: (context) => {
            pl.callCommand(context.id, {
              // context === innerContext
              run: (innerContext) => {
                // should execute this
                if (context.id !== innerContext.id) {
                  // console.error('context', context, innerContext);
                  throw new Error('context and innerContext id do not match');
                }
                ran = true;
              }
            });
          }
        };
      }
    }

    pit('should execute a command object via context.callCommand', function() {
      let r = new CallsRuntimeCommand();
      let p = new DryadPlayer(r, [layer]);
      return p.play().then(() => {
        expect(ran).toBe(true);
      });
    });

    pit('should set context.callCommand in children', function() {
      let r = new Dryad({}, [new CallsRuntimeCommand()]);
      let p = new DryadPlayer(r, [layer]);
      return p.play().then(() => {
        expect(ran).toBe(true);
      });
    });

    // implement this test when you have implemented .update
    // pit('should execute context.callCommand for any Dryad added by .add', function() {
    //   let root = new CallsRuntimeCommand();
    //   let player = new DryadPlayer(root, [layer]);
    //   return player.play().then(() => {
    //     expect(ran).toBe(true);
    //   });
    //
    // });

  });

  // it('on prepare should update context of parent so child sees it', function() {
  //   return player.play().then(() => {
  //     let rootId = player.tree.tree.id;
  //     let childId = player.tree.tree.children[0].id;
  //
  //   });
  // });

});
