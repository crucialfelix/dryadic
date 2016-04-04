import * as _  from 'underscore';


/**
 * Executes command trees using registered middleware.
 */
export default class CommandMiddleware {

  constructor(middlewares=[]) {
    this.middlewares = middlewares;
  }

  use(middlewares) {
    this.middlewares = this.middlewares.concat(middlewares);
  }

  /**
   * Each middleware is passed a flattened depth-first list of command objects.
   * They reduce that stack to a single function (`middleware.callStack`)
   * according to the command keys that they implement
   * and then the final function is execute the commands.
   *
   * Any command that returns a Promise will be resolved,
   * and the entire action (play, stop, update) is considered complete
   * when all commands have resolved.
   *
   * @returns {Promise} - resolves when all executed commands have resolved
   */
  call(commandRoot) {
    let stack = this._flatten(commandRoot);
    return Promise.all(this.middlewares.map((m) => m(stack)));
  }

  /**
   * Given a command object return a flat list of the commands and the childrens' command objects
   */
  _flatten(node) {
    return [
      new Command(node.commands, node.context)
    ].concat(_.flatten(node.children.map((n) => this._flatten(n)), true));
  }
}


class Command {

  constructor(command, context) {
    this.command = command;
    this.context = context;
  }
}
