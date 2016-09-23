
import {invertDryadicProperties} from '../Properties';
import Dryad from '../Dryad';

describe('invertDryadicProperties', function() {

  class ValueDryad extends Dryad {
    value() {
      return 1;
    }
  }

  let c = new Dryad({key: 'value'});
  let d = new Dryad({
    key: new ValueDryad()
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
    let src = o.children[1];
    expect(src.constructor.name).toBe('Dryad');
    let fn = src.properties.key;
    expect(typeof fn).toBe('function');
    // supply a fake getChildValue to it
    let v = fn({getChildValue: (/*ci*/) => 2});
    expect(v).toBe(2);
  });

});
