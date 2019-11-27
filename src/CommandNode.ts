import isFunction from "lodash/isFunction";

import { Command, Context, Middleware, Properties, UpdateContext } from "./types";
import { mapProperties } from "./utils";

export const enum CallOrder {
  SELF_THEN_CHILDREN = "SELF_THEN_CHILDREN",
  PROPERTIES_MODE = "PROPERTIES_MODE",
}

export default class CommandNode {
  commands: Command;
  context: Context;
  properties: Properties;
  id: string;
  children: CommandNode[];

  constructor(commands: Command, context: Context, properties: Properties, id: string, children: CommandNode[] = []) {
    this.commands = commands;
    this.context = context;
    this.properties = properties;
    this.id = id;
    this.children = children;
  }

  callFuncs(): Properties {
    return mapProperties(this.properties, (value: any): any => (isFunction(value) ? value(this.context) : value));
  }

  /**
   * Execute this CommandNode and call it's children.
   *
   * By default this executes it's children in parallel.
   * Each child would also by default execute it's own children
   * in parallel, so the entire command tree will execute in
   * parallel and resolve when the last straggler resolves.
   *
   * But there are many cases where you wish to block and
   * complete execution before progressing down the tree.
   * eg. booting a server before communicating with it.
   *
   * So a Dryad may pass a callOrder flag in the commands to
   * specify one of several modes of blocking.
   *
   *   {
   *     callOrder: CallOrder.SELF_THEN_CHILDREN
   *   }
   *
   * The modes are:
   *
   * SELF_THEN_CHILDREN - First execute this, when it resolves
   * then call the children (in parallel).
   * This is useful if the Dryad is something like booting a
   * process that the children will need to call communicate with.
   * Wait until the process is booted before proceeding.
   *
   * PROPERTIES_MODE - Special case for dryads in properties.
   * The children of Properties are:
   *
   *    [dryadicProperty1, dryadicProperty2 ... PropertiesOwner].
   *
   * So this mode specifies that each of the dryadicProperties
   * needs to complete before proceeding to the PropertiesOwner.
   *
   * Default is this and children in parallel.
   */
  async call(stateTransitionName: string, middlewares: Middleware[], updateContext: UpdateContext): Promise<void> {
    // console.log('CommandNode.call', stateTransitionName, this.context.id, this.commands, this.commands.callOrder || 'parallel');

    const execSelf = this.execute(stateTransitionName, middlewares, updateContext);
    const call = (child: CommandNode): Promise<void> => {
      return child.call(stateTransitionName, middlewares, updateContext);
    };

    switch (this.commands.callOrder) {
      case CallOrder.SELF_THEN_CHILDREN:
        await execSelf;
        await Promise.all(this.children.map(call));
        return;
      case CallOrder.PROPERTIES_MODE:
        await execSelf;
        // the properties dryads
        await Promise.all(this.children.slice(0, -1).map(call)).then(() => call(this.children.slice(-1)[0]));
        return;
      default:
        if (!this.commands.callOrder) {
          await Promise.all([execSelf].concat(this.children.map(call)));
          return;
        }

        throw new Error(`callOrder mode not recognized: ${this.commands.callOrder}`);
    }
  }

  /**
   * Execute this CommandNode's commands
   */
  async execute(stateTransitionName: string, middlewares: Middleware[], updateContext: UpdateContext): Promise<void> {
    const properties = this.callFuncs();
    const calls = middlewares.map((middleware: Middleware) => {
      return middleware(this.commands, this.context, properties, updateContext);
    });

    try {
      await Promise.all(calls);
      updateContext(this.context, { state: { [stateTransitionName]: true } });
    } catch (error) {
      // log error
      updateContext(this.context, {
        state: { [stateTransitionName]: false, error },
      });
      error.message = `${error.message} in ${this.context.id}`;
      return Promise.reject(error);
    }
  }
}
