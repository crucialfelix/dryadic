/* @flow */
var Dryad = require('../Dryad').default;
var DryadTree = require('../DryadTree').default;
var DryadPlayer = require('../DryadPlayer').default;
var layer = require('../layer').default;
import { makeApp } from './_testUtils';

class TypeOne extends Dryad {

  // for testing Dryads in properties
  value() : number {
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

    expect(tree.tree.dryadType).toBe('TypeOne');
    expect(tree.tree.children.length).toBe(1);
    expect(tree.tree.children[0].id).toBe('0.0');
    expect(tree.tree.children[0].dryadType).toBe('TypeTwo');
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

  it('should create context with parent as Prototype so parent properties are accessible', function() {
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
    expect(tree.tree.children[0].dryadType).toBe('TypeTwo');
  });

  it('should make tree with subgraph with self as a new child', function() {
    var root = new HasSubgraphWithSelf();
    var tree = new DryadTree(root);

    expect(Object.keys(tree.dryads).length).toBe(3);
    expect(tree.tree.dryadType).toBe('TypeOne');
    expect(tree.tree.children.length).toBe(1);
    expect(tree.tree.children[0].dryadType).toBe('HasSubgraphWithSelf');
  });

  /**
   * You can only do requireParent if the classes are registered
   * by name with the DryadPlayer / app.
   */
  describe('required parent', function() {

    it('Child should be wrapped in required Parent', function() {
      let app = makeApp([Child, Parent, TypeOne]);
      var root = new Child({}, [new TypeOne()]);
      app.setRoot(root);
      var tree = app.tree;
      expect(tree.tree.children.length).toBe(1);
      let child = tree.tree.children[0];
      expect(child.dryadType).toBe('Child');
      expect(child.children[0].dryadType).toBe('TypeOne');
    });

    it('should not wrap a dryad in a required parent if already present in branch', function() {
      let app = makeApp([Child, Parent, TypeOne]);
      var root = new Parent({}, [new Child({}, [new TypeOne()])]);
      app.setRoot(root);
      var tree = app.tree;
      let child = tree.tree.children[0];
      expect(child.dryadType).toBe('Child');
      expect(child.children[0].dryadType).toBe('TypeOne');
    });
  });

  describe('Dryads in properties', function() {

    it('should invert Dryads in properties as a Properties dryad', function() {
      let app = makeApp([Child, Parent, TypeOne]);
      var root = new Parent({key: new TypeOne()}, []);
      app.setRoot(root);
      var treeRoot = app.tree.tree;
      expect(treeRoot.dryadType).toBe('Properties');
      let child = treeRoot.children[0];
      expect(child.dryadType).toBe('TypeOne');
      let source = treeRoot.children[1];
      expect(source.dryadType).toBe('Parent');
      let propertyAccessor = source.dryad.properties.key;
      expect(typeof propertyAccessor).toBe('function');
      let result = propertyAccessor({getChildValue: () => 'yes'});
      expect(result).toBe('yes');
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

  describe('collectCommands', function() {
    it('should include properties', function() {
      let app = makeApp([Child, Parent, TypeOne]);
      var root = new Parent({key: new TypeOne()}, []);
      app.setRoot(root);

      // this is the top level command
      let cmds = app.tree.collectCommands('add', app.tree.tree, app);
      // get the Parent which is now the last child of the Proeprties (the play graph root)
      let parentCmd = cmds.children[1];
      // let typeOneCmd = cmds.children[0];
      // properties.key should be the value: 1
      // Object { '0': undefined }
      // which looks like mapping an array thinking that its an object
      expect(parentCmd.properties).toBeDefined();
      // expect(typeof parentCmd.properties.key).toBe('number');
      expect(parentCmd.properties.key).toBe(1);
      // that when evaluated with produces the number 1
    });
  });

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

  describe('updateContext', function() {
    var tree, dryadId;
    beforeEach(() => {
      let root = new Dryad();
      let app = new DryadPlayer(root, [layer]);
      tree = app.tree;
      dryadId = tree.tree.id;
    });

    it('should set a top level value on context', function() {
      tree.updateContext(dryadId, {key: 'value'});
      let c = tree.contexts[dryadId];
      expect(c.key).toBe('value');
    });

    it('should set an object', function() {
      let obj = {
        sub: 'value'
      };

      tree.updateContext(dryadId, {obj: obj});
      let c = tree.contexts[dryadId];
      expect(c.obj.sub).toBe('value');
    });

    it('should replace a sub object', function() {
      let obj = {
        sub: 'value'
      };

      tree.updateContext(dryadId, {obj: obj});
      tree.updateContext(dryadId, {obj: {
        sub2: 'value2'
      }});

      let c = tree.contexts[dryadId];
      expect(c.obj.sub).toBeUndefined();
      expect(c.obj.sub2).toBe('value2');
    });

    it('should remove an object if it is set to undefined', function() {
      /**
       * Removing a top level object.
       * Could explicitly delete the key but for now just set it to undefined
       * if you need to remove something.
       */
      let obj = {
        sub: 'value',
        sub2: 'value2'
      };
      let obj2 = {
        other: 'thing'
      };

      tree.updateContext(dryadId, {obj, obj2});
      tree.updateContext(dryadId, {obj: undefined, obj2});
      let c = tree.contexts[dryadId];
      expect(c.obj).toBeUndefined();
      expect(c.obj2).toBe(obj2);
    });
  });
});
