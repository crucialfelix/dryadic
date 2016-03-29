
jest.dontMock('../hyperscript');
jest.dontMock('../Dryad');
var hyperscript = require('../hyperscript').default;
var Dryad = require('../Dryad').default;

class GenericDryad extends Dryad {}

function lookupClassByNameFn(className) {
  if (className === GenericDryad.name.toLowerCase()) {
    return GenericDryad;
  }
  throw new Error('Unexpected className: ' + className);
}

describe('hyperscript', function() {

  it('should pass a Dryad through', function() {
    let input = new GenericDryad();
    let output = hyperscript(input, lookupClassByNameFn);
    expect(output).toBe(input);
  });

  it('should create a Dryad from supplying the class', function() {
    let input = [GenericDryad, {key: 'value'}, []];
    let output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({key: 'value'});
    expect(output.children).toEqual([]);
  });

  it('should create a Dryad from 3 args', function() {
    let input = ['genericdryad', {key: 'value'}, []];
    let output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({key: 'value'});
    expect(output.children).toEqual([]);
  });

  it('should create a Dryad from 2 args', function() {
    let input = ['genericdryad', []];
    let output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({});
    expect(output.children).toEqual([]);
  });

  it('should create a Dryad from 1 arg', function() {
    let input = ['genericdryad'];
    let output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({});
    expect(output.children).toEqual([]);
  });

  it('should create Dryad for children', function() {
    let input = ['genericdryad', [
      ['genericdryad', {}, []]
    ]];
    let output = hyperscript(input, lookupClassByNameFn);
    expect(output.isDryad).toBe(true);
    expect(output.properties).toEqual({});
    expect(output.children.length).toEqual(1);
    expect(output.children[0].isDryad).toBeTruthy();
  });

});
