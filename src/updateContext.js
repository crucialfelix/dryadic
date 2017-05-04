/* @flow */
import isFunction from 'lodash/isFunction';
import keys from 'lodash/keys';
import isPlainObject from 'is-plain-object';
import { Promise } from 'bluebird';

/**
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
export default function updateContext(
  command: Object,
  context: Object,
  properties: Object,
  updater: Function
): Promise {
  if (command.updateContext) {
    let uc: Object = isFunction(command.updateContext)
      ? command.updateContext(context, properties)
      : command.updateContext;
    return resolveValues(uc).then(updates => {
      updater(context, updates);
    });
  }
}

function resolveValues(object: Object): Promise<Object> {
  const ks = keys(object);
  return Promise.map(ks, key => {
    let value = object[key];
    // if is object then go deep
    return Promise.resolve(isPlainObject(value) ? resolveValues(value) : value);
  }).then(values => {
    let result = {};
    ks.forEach((key, i) => {
      result[key] = values[i];
    });
    return result;
  });
}
