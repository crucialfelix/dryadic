import CommandNode from "./CommandNode";
import { Middleware, UpdateContext } from "./types";

/**
 * Executes command trees using registered middleware.
 *
 * Middleware are functions that take two arguments: commandObject, context
 *
 * Where commandObject may have multiple keys, and middleware may handle none or more of those keys.
 * eg. the `run` middleware handles only the command key `run`
 */
export default class CommandMiddleware {
  middlewares: Middleware[];

  constructor(middlewares: Middleware[] = []) {
    this.middlewares = middlewares;
  }

  use(middlewares: Middleware[]): void {
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
   * @param {UpdateContext} updateContext - supplied by the DryadPlayer, a function to update the context for a node.
   *
   * @returns {Promise} - resolves when all executed commands have resolved
   */
  async call(commandRoot: CommandNode, stateTransitionName: string, updateContext: UpdateContext): Promise<void> {
    await commandRoot.call(stateTransitionName, this.middlewares, updateContext);
  }
}
