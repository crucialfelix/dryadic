

var Dryad = require('../Dryad').default;
var DryadTree = require('../DryadTree').default;
var DryadPlayer = require('../DryadPlayer').default;
var layer = require('../layer').default;


class TypeOne extends Dryad {}
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
    return 'Parent';
  }
}


describe('DryadTree', function() {
  it('should construct', function() {
    var root = new TypeOne({}, [new TypeTwo()]);
    var tree = new DryadTree(root);

    expect(tree.root).toBe(root);
    expect(Object.keys(tree.dryads).length).toBe(2);
    expect(Object.keys(tree.contexts).length).toBe(2);

    expect(tree.tree.type).toBe('TypeOne');
    expect(tree.tree.children.length).toBe(1);
    expect(tree.tree.children[0].id).toBe('0.0');
    expect(tree.tree.children[0].type).toBe('TypeTwo');
  });

  it('should walk', function() {
    var root = new TypeOne({}, [new TypeTwo()]);
    var tree = new DryadTree(root);

    var count = 0;
    tree.walk((/*dryad, context, node*/) => {
      count += 1;
    });

    expect(count).toBe(2);
  });

  it('should create a context with parent as Prototype', function() {
    var root = new TypeOne({}, [new TypeTwo()]);
    var tree = new DryadTree(root);
    var rootId = tree.tree.id;
    var childId = tree.tree.children[0].id;

    tree.updateContext(rootId, {changed: 'value'});
    expect(tree.contexts[childId].changed).toBe('value');
  });

  it('should make tree with subgraph', function() {
    var root = new HasSubgraph();
    var tree = new DryadTree(root);

    // 3 not 2 ?
    // because the parent is registered twice with two different ids
    // even though it only appears in the tree once
    expect(Object.keys(tree.dryads).length).toBe(3);
    expect(tree.tree.children.length).toBe(1);
    expect(tree.tree.children[0].type).toBe('TypeTwo');
  });

  it('should make tree with subgraph with self as a new child', function() {
    var root = new HasSubgraphWithSelf();
    var tree = new DryadTree(root);

    expect(Object.keys(tree.dryads).length).toBe(3);
    expect(tree.tree.type).toBe('TypeOne');
    expect(tree.tree.children.length).toBe(1);
    expect(tree.tree.children[0].type).toBe('HasSubgraphWithSelf');
  });

  /**
   * You can only do requireParent if the classes are registered
   * by name with the DryadPlayer / app.
   */
  describe('required parent', function() {

    function makeApp() {
      let app = new DryadPlayer();
      app.addClass(Child);
      app.addClass(Parent);
      return app;
    }

    it('Child should be wrapped in required Parent', function() {
      let app = makeApp();
      var root = new Child({}, [new TypeOne()]);
      app.setRoot(root);
      var tree = app.tree;
      expect(tree.tree.children.length).toBe(1);
      let child = tree.tree.children[0];
      expect(child.type).toBe('Child');
      expect(child.children[0].type).toBe('TypeOne');
    });

    it('should not wrap a dryad in a required parent if already present in branch', function() {
      let app = makeApp();
      var root = new Parent({}, [new Child({}, [new TypeOne()])]);
      app.setRoot(root);
      var tree = app.tree;
      let child = tree.tree.children[0];
      expect(child.type).toBe('Child');
      expect(child.children[0].type).toBe('TypeOne');
    });
  });

  describe('prepareForAdd can be a function', function() {
    var value = 'value';

    class ParentWithPrepareFn extends Dryad {
      prepareForAdd() {
        return {
          one: (context) => {
            if (!context) {
              throw new Error('no contex supplied to prepareForAdd inner function');
            }
            return value;
          },
          two: value
        };
      }
    }

    class Inner extends Dryad {}

    pit('should call fn and save to context', function() {
      var root = new ParentWithPrepareFn({}, [new Inner({})]);
      var app = new DryadPlayer(root);
      return app.play().then(() => {
        var tree = app.tree;
        var rootId = tree.tree.id;
        var childId = tree.tree.children[0].id;

        // root context should have one two = 'value'
        expect(tree.contexts[rootId].one).toBe(value);
        expect(tree.contexts[rootId].two).toBe(value);
        // child context should have those also
        expect(tree.contexts[childId].one).toBe(value);
        expect(tree.contexts[childId].two).toBe(value);
      });
    });
  });

  // describe('collectCommands', function() {
  //
  //   let value = 'value';
  //
  //   class Adds extends Dryad {
  //     add() {
  //       return {
  //         one: () => value
  //       };
  //     }
  //   }
  //
  //   it('should collect add commands with extra context', function() {
  //     let root = new Adds();
  //     let app = new DryadPlayer(root);
  //     let callCommand = 'callCommand';
  //     let ctree = app._collectCommands('add', {callCommand: callCommand});
  //     expect(ctree.context.callCommand).toBe(callCommand);
  //   });
  // });

  describe('makeCommandTree', function() {
    pit('should make a command tree given a single command', function() {
      let root = new Dryad();
      let app = new DryadPlayer(root, [layer]);
      let rootId = app.tree.tree.id;
      let ran = false;
      let commands = {
        run: () => ran = true
      };
      let ctree = app.tree.makeCommandTree(rootId, commands);
      expect(ctree.commands).toBe(commands);
      expect(app.middleware.middlewares.length).toBeTruthy();

      return app._call(ctree).then(() => {
        expect(ran).toBe(true);
      });
    });
  });
});
