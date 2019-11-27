import isPlainObject from "is-plain-object";
import isFunction from "lodash/isFunction";

import { Command, Context, Properties, UpdateContext } from "./types";

/**
 * updateContext Middleware
 *
 * Updates the player's context using DryadTree.updateContext
 *
 * Usage:
 *
 * Simplest example. The context is updated with someKey = 'someValue'
 *
 *  add() {
 *   return {
 *    updateContext: {
 *      someKey: 'someValue'
 *    }
 *   };
 *  }
 *
 * or:
 *
 *  prepareForAdd() {
 *    return {
 *      // return a function that will be called at command execution time
 *      updateContext: (context, properties) => {
 *        let nodeID = generateNextId();
 *        // these are the values that will be updated into context
 *        return {
 *          nodeID: nodeID,
 *          pid: startSomeProcess()  // any value that is a Promise will be resolved
 *        };
 *      }
 *    };
 *  }
 *
 */
export default async function updateContext(
  command: Command,
  context: Context,
  properties: Properties,
  updater: UpdateContext,
): Promise<void> {
  if (command.updateContext) {
    const uc: Context = isFunction(command.updateContext)
      ? command.updateContext(context, properties)
      : command.updateContext;
    const updates = await resolveValues(uc);
    updater(context, updates);
  }
}

async function resolveValues(object: Context): Promise<Context> {
  // resolves all values of an object
  const result = {};
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      const element = object[key];
      // if it's an object then resolve it's values
      result[key] = isPlainObject(element) ? await resolveValues(element) : await Promise.resolve(element);
    }
  }
  return result;
}
