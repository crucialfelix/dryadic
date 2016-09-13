

var Dryad = require('../Dryad').default;
var DryadPlayer = require('../DryadPlayer').default;
var layer = require('../layer').default;

class TypeOne extends Dryad {

  prepareForAdd() {
    return {
      something: () => {
        return Promise.resolve('something');
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

class PrepareWithFunction extends Dryad {
  prepareForAdd() {
    return (/*context*/) => {
      return {
        one: 1,
        two: 2
      };
    };
  }
}

describe('DryadPlayer', function() {

  describe('constructor', function() {
    var root;
    var player;

    beforeEach(() => {
      root = new TypeOne({}, [new Child()]);
      player = new DryadPlayer(root);
      player.addClass(TypeOne);
    });

    it('should construct', function() {
      expect(player).toBeTruthy();
    });

    it('should have registered TypeOne', function() {
      expect(player.classes['typeone']).toBeTruthy();
    });

    pit('should play', function() {
      return player.play();
    });

    pit('should update context on prepareForAdd', function() {
      // only if you give it a middleware to process 'something'
      return player.play().then(() => {
        let rootId = player.tree.tree.id;
        let childId = player.tree.tree.children[0].id;
        expect(player.tree.contexts[rootId].something).toBe('something');
        expect(player.tree.contexts[childId].something).toBe('something');
      });
    });

    pit('should stop', function() {
      return player.stop();
    });

  });

  describe('setRoot', function() {
    var root;
    var player;

    beforeEach(() => {
      root = new TypeOne({}, [new Child()]);
      player = new DryadPlayer();
      player.addClass(TypeOne);
    });

    it('should setRoot', function() {
      player.setRoot(root);
      expect(player.tree).toBeTruthy();
    });
  });

  describe('prepareForAdd with function', function() {
    var root;
    var player;

    beforeEach(() => {
      root = new PrepareWithFunction();
      player = new DryadPlayer(root);
    });

    pit('should update context on prepareForAdd if that returns a function', function() {
      return player.play().then(() => {
        let rootId = player.tree.tree.id;
        expect(player.tree.contexts[rootId].one).toBe(1);
        expect(player.tree.contexts[rootId].two).toBe(2);
      });
    });
  });

  describe('callCommand', function() {

    let ran = false;

    class CallsRuntimeCommand extends Dryad {
      add(player) {
        return {
          run: (context) => {
            player.callCommand(context.id, {
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
      let root = new CallsRuntimeCommand();
      let player = new DryadPlayer(root, [layer]);
      return player.play().then(() => {
        expect(ran).toBe(true);
      });
    });

    pit('should set context.callCommand in children', function() {
      let root = new Dryad({}, [new CallsRuntimeCommand()]);
      let player = new DryadPlayer(root, [layer]);
      return player.play().then(() => {
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
