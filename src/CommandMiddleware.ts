/* @flow */
import type CommandNode from './CommandNode';

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
   * @param {CommandNode} commandRoot - The root command node of the tree as collected by DryadTree collectCommands. It contains pointers to the children.
   * @param {String} stateTransitionName - Each node has its context updated after success or failure as:
   *                            `{state: {[stateTransitionName]: true|false[, error: error]}}`
   *                            On failure the error will also be stored here for debugging.
   * @param {Function} updateContext - supplied by the DryadPlayer, a function to update the context for a node.
   *
   * @returns {Promise} - resolves when all executed commands have resolved
   */
  call(commandRoot:CommandNode, stateTransitionName:string, updateContext:Function) : Promise<*> {
    return commandRoot.call(stateTransitionName, this.middlewares, updateContext);
  }
}
