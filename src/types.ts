// import { CallOrder } from "./CommandNode";
import { DryadType } from "./Dryad";

export { CallOrder } from "./CommandNode";

/**
 * Dryad classes are added from other packages via a Layer.
 * A Layer adds classes and middleware functions.
 */
export interface Layer {
  middleware: Middleware[];
  classes: DryadType<any>[];
}

/**
 * Each of a Dryad's lifecyle methods (prepareForAdd, add, remove) returns a Command object.
 * These specify what actions to perform to accomplish the change of state.
 * (creating or removing a resource, setting a parameter etc.)
 *
 * Each key in the Command is the name of a registered middleware (provided by a Layer),
 * and the value is what is passed to the Middleware.
 *
 * Examples:
 * ```js
 * {
 *    // The `run` middleware is a simple function
 *    run: (context: Context) => {
 *      console.log(context);
 *      // You can do anything here: fetch http, send midi, send osc, read files.
 *      // return a Promise that resolves when action is complete or rejects when something failed.
 *      return whenNodeEnd(context.scserver, context.id, context.nodeID)
 *    },
 *    // update this node's Context
 *    updateContext: (context: Context, properties: Properties) => {
 *      // return an object that will overwrite or add new values to this node's Context
 *      return {
 *        nodeID: context.scserver.state.nextNodeID()
 *      }
 *    }
 * }
 * ```
 *
 */
export interface Command {
  // middlwareName: value
  // function or object
  [middlwareName: string]: MiddlewareCommand;
  // run
  // updateContext
}

// type CommandBodyMakerFn = (context: Context) => MiddlewareCommand | Promise<MiddlewareCommand>;
export type MiddlewareCommand = any; //Function | Record<string, any> | CallOrder;

/**
 * Middleware are supplied by layers and provide reusable functions for use in Commands.
 *
 * A Command can will match command keys and will be passed the value.
 * Value is either an object that the middleware uses to do whatever it does (launch things, send messages) or is a function that take context and returns the object.
 *
 * Command middleware for add may return Promises which resolve on success; ie. when the thing is successfully booted, running etc.
 */
export type Middleware = (
  command: Command,
  context: Context,
  properties: Properties,
  updateContext: UpdateContext,
) => void | Promise<void>;

export interface Properties {
  [key: string]: any;
}

export interface Context {
  [key: string]: any;
}

/**
 * Function to update a node's context.
 *
 * This is passed into the middleware.
 */
export type UpdateContext = (context: Context, updates: Context) => void;

// StateTransition
// prepareForAdd add remove

// export interface DebugState {
//   add: string;
//   remove: string;
//   prepared: string;
// }
//

export interface HyperScript extends HyperScriptTuple<HyperScript> {}
type HyperScriptTuple<T> = [string, Properties, T[]];
