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
import clone from "lodash/clone";

import { CallOrder } from "./CommandNode";
import Dryad from "./Dryad";
import DryadPlayer from "./DryadPlayer";
import { Command, Context } from "./types";
import { className, isDryad, mapProperties } from "./utils";

/**
 * Parent wrapper whose children are the properties and the PropertiesOwner as siblings.
 */
export default class Properties extends Dryad {
  prepareForAdd(): Command {
    return {
      callOrder: CallOrder.PROPERTIES_MODE,
    };
  }
}

interface PropertiesOwnerProperties {
  indices: number[];
}

/**
 * Object that holds the owner - the Dryad that had Dryads in it's .properties
 */
export class PropertiesOwner extends Dryad<PropertiesOwnerProperties> {
  prepareForAdd(player: DryadPlayer): Command {
    return {
      callOrder: CallOrder.SELF_THEN_CHILDREN,
      updateContext: (context: Context) => {
        // Context has an id
        return {
          propertiesValues: this.properties.indices.map((i: number): any => {
            // x.y.z.props.{$context.id} -> x.y.z.props.{$i}
            if (player.tree) {
              const propDryadId = context.id.replace(/\.([0-9]+)$/, `.${i}`);
              const propDryad = player.tree.dryads[propDryadId];
              const propContext = player.tree.contexts[propDryadId];
              const value = propDryad.value(propContext);
              return value;
            }
            return undefined;
          }),
        };
      },
    };
  }
}

/**
 * If a Dryad contains Dryads in it's properties then return a Properties
 * that inverts the play graph so those dryadic properties come first.
 *
 * Returns a Properties or undefined if there are no Dryads in the properties.
 */
export function invertDryadicProperties(dryad: Dryad): Properties | void {
  let ci = -1;
  const children: Dryad[] = [];
  const indices: number[] = [];

  const cname = className(dryad);

  if (cname === "Properties" || cname === "PropertiesOwner") {
    return;
  }

  /**
   * Map the properties to functions that will retrieve the dryad's 'value'.
   */
  const propertyAccessors = mapProperties(dryad.properties, value => {
    if (isDryad(value)) {
      ci = ci + 1;
      const childIndex = ci;
      // It must implement .value
      // if (!isFunction(value.value)) {
      //   throw new Error(`${value} does not implement .value; cannot use this as a .property`);
      // }

      children.push(cloneValue(value));
      indices.push(ci);

      // Here there must be propertiesValues as set by PropertiesOwner
      // in prepareForAdd. that is the direct parent of this (actual owner)
      return (context: Context): any => {
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

  const owner: Dryad = Object.create(dryad, {
    properties: { value: propertyAccessors },
    children: { value: dryad.children.map(cloneValue) },
  });

  children.push(new PropertiesOwner({ indices }, [owner]));

  return new Properties({}, children);
}

function cloneValue(value: any): any {
  return isDryad(value) ? value.clone() : clone(value);
}
