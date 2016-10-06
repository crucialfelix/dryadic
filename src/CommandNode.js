/* @flow */
import * as _ from 'underscore';
import { mapProperties } from './utils';

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

  callThunks() {
    return mapProperties(this.properties, (value) : any => {
      return _.isFunction(value) ? value(this.context) : value;
    });
  }

  call(actionName:string, middlewares:Array<Function>, updateContext:Function) : Promise<*> {
    let properties = this.callThunks();
    const calls = middlewares.map((middleware:Function) => {
      return middleware(this.commands, this.context, properties, updateContext)
    });

    return Promise.all(calls)
      .then(() => {
        updateContext(this.context, {state: {[actionName]: true}});
      }, (error:Error) => {
        // log error
        updateContext(this.context, {state: {[actionName]: false, error}});
        error.message = `${error.message} in ${this.context.id}`;
        return Promise.reject(error);
      });

  }
}
