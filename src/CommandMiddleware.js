/* @flow */
import * as _ from 'underscore';


/**
 * Executes command trees using registered middleware.
 *
 * Middleware are functions that take two arguments: commandObject, context
 *
 * Where commandObject may have multiple keys, and middleware may handle none or more of those keys.
 * eg. the `run` middleware handles only the command key `run`
 */
export default class CommandMiddleware {

  middlewares: Array<Function>;

  constructor(middlewares:Array<Function>=[]) {
    this.middlewares = middlewares;
  }

  use(middlewares:Array<Function>) {
    this.middlewares = this.middlewares.concat(middlewares);
  }

  /**
   * Each middleware is called with each command in a flattened depth-first stack.
   *
   * Any command that returns a Promise will be resolved,
   * and the entire action (add, remove, update) is considered complete
   * when all command results have resolved.
   *
   *
   *
   * @param {Object} commandRoot - The root command node of the tree as collected by DryadTree collectCommands. It contains pointers to the children.
   * @param {String} actionName - Each node has its context updated after success or failure as `{state: {actionName: true|false[, error: error]}}` On failure the error will also be stored here for debugging.
   * @param {Function} updateContext - supplied by the DryadPlayer, a function to update the context for a node.
   *
   * @returns {Promise} - resolves when all executed commands have resolved
   */
  call(commandRoot:Object, actionName:string, updateContext:Function) : Promise<*> {
    const stack = this._flatten(commandRoot);
    const promises = stack.map((cc) => {
      const calls = this.middlewares.map((middleware) => middleware(cc.commands, cc.context, updateContext));
      return Promise.all(calls)
        .then(() => {
          updateContext(cc.context, {state: {[actionName]: true}});
        }, (error) => {
          // log error
          updateContext(cc.context, {state: {[actionName]: false, error}});
          return Promise.reject(error);
        });
    });
    return Promise.all(promises);
  }

  /**
   * Given a command object return a flat list of the commands and the childrens' command objects
   */
  _flatten(node:Object) : Array<Object> {
    return [
      {commands: node.commands, context: node.context}
    ].concat(_.flatten(node.children.map((n) => this._flatten(n)), true));
  }
}
