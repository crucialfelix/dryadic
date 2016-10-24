/* @flow */
import * as _ from 'underscore';
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
export default function updateContext(command:Object, context:Object, properties:Object, updater:Function) : Promise {
  if (command.updateContext) {
    let uc:Object = _.isFunction(command.updateContext) ?
      command.updateContext(context, properties) : command.updateContext;
    return resolveValues(uc).then((updates) => {
      updater(context, updates);
    });
  }
}


function resolveValues(object:Object) : Promise<Object> {
  const keys = _.keys(object);
  return Promise.map(keys, (key) => {
    let value = object[key];
    // if is object then go deep
    return Promise.resolve(isPlainObject(value) ? resolveValues(value) : value);
  }).then((values) => {
    let result = {};
    keys.forEach((key, i) => {
      result[key] = values[i];
    });
    return result;
  });
}
