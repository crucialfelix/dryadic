
jest.dontMock('../Dryad');
jest.dontMock('../DryadTree');
jest.dontMock('../DryadPlayer');
jest.dontMock('../CommandMiddleware');

var Dryad = require('../Dryad').default;
var DryadPlayer = require('../DryadPlayer').default;

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
      // console.log('context', context);
      return {
        one: 1,
        two: 2
      };
    };
  }
}

describe('DryadPlayer', function() {

  describe('basics', function() {
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


  // it('on prepare should update context of parent so child sees it', function() {
  //   console.log(player.tree.tree);
  //   return player.play().then(() => {
  //     let rootId = player.tree.tree.id;
  //     let childId = player.tree.tree.children[0].id;
  //
  //   });
  // });

});
