/* @flow */
import * as _ from 'underscore';
import { Promise } from 'bluebird';
import { mapProperties } from './utils';

export const SELF_THEN_CHILDREN = 'SELF_THEN_CHILDREN';
export const PROPERTIES_MODE = 'PROPERTIES_MODE';
export const CALL_ORDER = {
  SELF_THEN_CHILDREN: SELF_THEN_CHILDREN,
  PROPERTIES_MODE: PROPERTIES_MODE
};


export default class CommandNode {

  commands:Object;
  context:Object;
  properties:Object;
  id:string;
  children:Array<CommandNode>;

  constructor(commands:Object, context:Object, properties:Object, id:string, children:Array<CommandNode>=[]) {
    this.commands = commands;
    this.context = context;
    this.properties = properties;
    this.id = id;
    this.children = children;
  }

  callFuncs() : Object {
    return mapProperties(this.properties, (value) : any => {
      return _.isFunction(value) ? value(this.context) : value;
    });
  }

  /**
   * Execute this CommandNode and call it's children.
   *
   * By default this executes and it's children in parallel.
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
   *     callOrder: CALL_ORDER.SELF_THEN_CHILDREN
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
  call(stateTransitionName:string, middlewares:Array<Function>, updateContext:Function) : Promise<*> {
    // console.log('CommandNode.call', stateTransitionName, this.context.id, this.commands, this.commands.callOrder || 'parallel');

    const execSelf = this.execute(stateTransitionName, middlewares, updateContext);
    const call = (child) => child.call(stateTransitionName, middlewares, updateContext);

    if (!this.commands.callOrder) {
      return Promise.all([execSelf].concat(this.children.map(call)));
    }

    switch (this.commands.callOrder) {
      case SELF_THEN_CHILDREN:
        return execSelf.then(() => {
          // TODO: remove this return and the tests should fail
          return Promise.all(this.children.map(call))
        });
      case PROPERTIES_MODE:
        return execSelf.then(() => {
          // the properties dryads
          return Promise.all(this.children.slice(0, -1).map(call))
            .then(() => call(this.children.slice(-1)[0]));
        });
      default:
        throw new Error(`callOrder mode not recognized: ${this.commands.callOrder}`);
    }
  }

  /**
   * Execute this CommandNode's commands
   */
  execute(stateTransitionName:string, middlewares:Array<Function>, updateContext:Function) : Promise<*> {
    let properties = this.callFuncs();
    const calls = middlewares.map((middleware:Function) => {
      return middleware(this.commands, this.context, properties, updateContext)
    });

    return Promise.all(calls)
      .then(() => {
        updateContext(this.context, {state: {[stateTransitionName]: true}});
      }, (error:Error) => {
        // log error
        updateContext(this.context, {state: {[stateTransitionName]: false, error}});
        error.message = `${error.message} in ${this.context.id}`;
        return Promise.reject(error);
      });

  }
}
