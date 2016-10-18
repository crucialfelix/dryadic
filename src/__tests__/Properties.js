
import { invertDryadicProperties } from '../Properties';
import Dryad from '../Dryad';
import dryadic from '../dryadic';


describe('Properties', function() {

  var propertiesSupplied = {
    prepareForAdd: null,
    add: null,
    remove: null
  };

  class OwnerDryad extends Dryad {

    prepareForAdd() {
      return {
        run: (context, properties) => {
          propertiesSupplied.prepareForAdd = properties;
        }
      };
    }

    add() {
      return {
        run: (context, properties) => {
          propertiesSupplied.add = properties;
        }
      };
    }

    remove() {
      return {
        run: (context, properties) => {
          propertiesSupplied.remove = properties;
        }
      };
    }
  }

  class ValueDryad extends Dryad {
    value() {
      return 1;
    }
  }

  let c = new Dryad({key: 'value'});
  let d = new OwnerDryad({
    one: new ValueDryad()
  });

  it('should return undefined if no dryads in properties', function() {
    let o = invertDryadicProperties(c);
    expect(o).toBeUndefined();
  });

  it('should return a Properties if dryad is in Properties', function() {
    let o = invertDryadicProperties(d);
    expect(o.constructor.name).toBe('Properties');
    let dp = o.children[0];
    expect(dp.constructor.name).toBe('ValueDryad');
    let pown = o.children[1];
    expect(pown.constructor.name).toBe('PropertiesOwner');
    let src = pown.children[0];
    expect(src.constructor.name).toBe('OwnerDryad');
    let fn = src.properties.one;
    expect(typeof fn).toBe('function');
  });

  describe('getting value in child', function() {

    beforeEach(() => {
      propertiesSupplied.prepareForAdd = null;
      propertiesSupplied.add = null;
      propertiesSupplied.remove = null;
    });

    pit('in prepareForAdd', function() {
      let p = dryadic(invertDryadicProperties(d));
      return p.prepare().then(() => {
        expect(propertiesSupplied.prepareForAdd).toEqual({one: 1});
      });
    });

    pit('in add', function() {
      let p = dryadic(invertDryadicProperties(d));
      return p.play().then(() => {
        expect(propertiesSupplied.add).toEqual({one: 1});
      });
    });

    pit('in remove', function() {
      let p = dryadic(invertDryadicProperties(d));
      return p.play().then(() => {
        p.stop().then(() => {
          expect(propertiesSupplied.remove).toEqual({one: 1});
        });
      });
    });
  });

  describe('grandparent context accessible by children', function() {

    class ParentDryad extends Dryad {
      initialContext() {
        return {
          urvalue: 0
        };
      }
    }

    let s = new ParentDryad({}, [
      new Dryad({
        key: new ValueDryad()
      })
    ]);

    it('should supply parent context to children ', function() {

      let p = dryadic(s);
      let state = p.getDebugState();

      let properties = state.children[0];
      // let valueDryad = properties.children[0];
      let parent = properties.children[1].children[0];

      let context = p.tree.getContext(parent.id);
      expect(context.urvalue).toBe(0);
    });

  });
});
