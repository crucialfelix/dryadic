/* @flow */
import * as _  from 'underscore';
import Dryad from './Dryad';
import { mapProperties, isDryad } from './utils';

/**
 * Holder class for inverted properties.
 * Doesn't actually have any functionality.
 */
export default class Properties extends Dryad {}


/**
 * If a Dryad contains Dryads in it's properties then return a Properties
 * that inverts the play graph so those dryadic properties come first.
 *
 * Returns a Properties or undefined if there are no Dryads in the properties.
 */
export function invertDryadicProperties(dryad:Dryad) : ?Properties {

  let ci = -1;
  let children = [];
  // should look the same
  // why does it say key ?
  let propertyAccessors = mapProperties(dryad.properties, (value) => {
    if (isDryad(value)) {
      ci = ci + 1;
      let childIndex = ci;
      // must implement .value
      // if (!_.isFunction(value.value)) {
      //   throw new Error(`${value} does not implement .value; cannot use this as a .property`);
      // }

      children.push(cloneValue(value));
      // context.getChildValue is set during DryadTree._makeTree
      return (context:Object) : any => context.getChildValue(childIndex);
    } else {
      return value;
    }
  });

  // there were no Dryads in .properties
  if (ci < 0) {
    return;
  }

  let source = new dryad.constructor(propertyAccessors, dryad.children.map(cloneValue));
  children.push(source);

  return new Properties({}, children)
}


function cloneValue(value:any) : any {
  return isDryad(value) ? value.clone() : _.clone(value);
}
