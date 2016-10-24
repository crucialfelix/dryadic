/* @flow */
/**
 * If a Dryad has Dryads in it's properties then bring then transform the playgraph.
 *
 * So this:
 *
 *  Synth({
 *    def: SCSynthDef(...)
 *  })
 *
 * is transformed to this in the playgraph:
 *
 *  Properties({}, [
 *    SCSynthDef(...),
 *    PropertiesOwner({...}, [
 *      Synth({def: accessorFunction})
 *    ])
 *  ]);
 *
 * Now the SCSynthDef is in the playgraph ahead of the Synth and can prepare and
 * compile what it needs to before the Synth needs to use the result.
 */
import * as _  from 'underscore';
import Dryad from './Dryad';
import { mapProperties, isDryad, className } from './utils';
import type DryadPlayer from './DryadPlayer';
import { PROPERTIES_MODE, SELF_THEN_CHILDREN } from './CommandNode';

/**
 * Parent wrapper whose children are the properties and the PropertiesOwner as siblings.
 */
export default class Properties extends Dryad {

  prepareForAdd() : Object {
    return {
      callOrder: PROPERTIES_MODE
    };
  }
}

/**
 * Object that holds the owner - the Dryad that had Dryads in it's .properties
 */
export class PropertiesOwner extends Dryad {

  prepareForAdd(player:DryadPlayer) {
    return {
      callOrder: SELF_THEN_CHILDREN,
      updateContext: (context:Object) => {
        return {
          propertiesValues: this.properties.indices.map((i) : any => {
            // x.y.z.props.{$context.id} -> x.y.z.props.{$i}
            let propDryadId = context.id.replace(/\.([0-9]+)$/, `.${i}`);
            let propDryad = player.tree.dryads[propDryadId];
            let propContext = player.tree.contexts[propDryadId];
            let value = propDryad.value(propContext);
            return value;
          })
        };
      }
    };
  }
}

/**
 * If a Dryad contains Dryads in it's properties then return a Properties
 * that inverts the play graph so those dryadic properties come first.
 *
 * Returns a Properties or undefined if there are no Dryads in the properties.
 */
export function invertDryadicProperties(dryad:Dryad) : ?Properties {

  let ci = -1;
  let children = [];
  let indices = [];

  let cname = className(dryad);
  // never
  if (cname === 'Properties' || (cname === 'PropertiesOwner')) {
    return;
  }

  /**
   * Map the properties to functions that will retrieve the dryad's 'value'.
   */
  let propertyAccessors = mapProperties(dryad.properties, (value) => {
    if (isDryad(value)) {
      ci = ci + 1;
      let childIndex = ci;
      // It must implement .value
      // if (!_.isFunction(value.value)) {
      //   throw new Error(`${value} does not implement .value; cannot use this as a .property`);
      // }

      children.push(cloneValue(value));
      indices.push(ci);

      // Here there must be propertiesValues as set by PropertiesOwner
      // in prepareForAdd. that is the direct parent of this (actual owner)
      return (context:Object) : any => {
        if (!context.propertiesValues) {
          throw new Error(`Missing propertiesValues from context ${context.id}`);
        }
        return context.propertiesValues[childIndex];
      };
    } else {
      return value;
    }
  });

  // There were no Dryads in .properties
  if (ci < 0) {
    return;
  }

  let owner = new dryad.constructor(propertyAccessors, dryad.children.map(cloneValue));
  children.push(new PropertiesOwner({indices}, [owner]));

  return new Properties({}, children);
}


function cloneValue(value:any) : any {
  return isDryad(value) ? value.clone() : _.clone(value);
}
