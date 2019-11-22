import Dryad from "./Dryad";

/**
 * A runtime Dryad class
 */
export interface DryadType<T extends Dryad = Dryad> {
  new (properties?: Properties, children?: Dryad[]): T;
}

export interface Command {
  [key: string]: any;
}

export const enum CallOrder {
  SELF_THEN_CHILDREN = "SELF_THEN_CHILDREN",
  PROPERTIES_MODE = "PROPERTIES_MODE",
}

export interface Commands {
  [action: string]: Function | CallOrder;
  // callOrder?: CallOrder;
}

export interface Context {
  [key: string]: any;
}

export type UpdateContext = (context: Context, updates: Context) => void;
export type Middleware = (
  command: Command,
  context: Context,
  properties: Properties,
  updateContext: UpdateContext,
) => Promise<any>;
// maybe void ?

export interface Properties {
  [key: string]: any;
}

export interface Layer {
  middleware: Middleware[];
  classes: DryadType[];
}

// StateTransition
// prepareForAdd add remove

// export interface DebugState {
//   add: string;
//   remove: string;
//   prepared: string;
// }

// type HyperScript = [string, Properties, HyperScript[] | []];

type HyperScriptTuple<T> = [string, Properties, T[]];
export interface HyperScript extends HyperScriptTuple<HyperScript> {}
