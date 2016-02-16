jest.dontMock('../Dryad');
var Dryad = require('../Dryad').default;

class TypeOne extends Dryad {}

describe('Dryad', function() {
  it('should clone', function() {
    let a = [1, 2, 3];
    let child = new TypeOne();
    let d = new TypeOne({one: 1, two: a}, [child]);

    let cloned = d.clone();
    expect(cloned.constructor.name).toBe(d.constructor.name);
    expect(cloned.properties !== d.properties).toBe(true);
    expect(cloned.children !== d.children).toBe(true);
    expect(cloned.properties.two !== d.properties.two).toBe(true);
    expect(cloned.children[0] !== d.children[0]).toBe(true);
  });
});
