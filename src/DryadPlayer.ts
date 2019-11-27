import CommandMiddleware from "./CommandMiddleware";
import CommandNode from "./CommandNode";
import Dryad, { DryadType } from "./Dryad";
import DryadTree, { DebugState } from "./DryadTree";
import hyperscript from "./hyperscript";
import run from "./run";
import { Command, Context, HyperScript, Layer, Middleware } from "./types";
import updateContext from "./updateContext";

interface ClassTable {
  [className: string]: DryadType;
}
export type GetClassFn = (className: string) => DryadType;

/**
 * Manages play/stop/update for a Dryad tree.
 *
 * A Dryad has no state or functionality until it is played
 * by a DryadPlayer. A Dryad can be played more than once at
 * the same time by creating more DryadPlayers.
 *
 * The DryadPlayer also holds the layers and command middleware
 * which execute the functionality that the Dryads specify.
 */
export default class DryadPlayer {
  middleware: CommandMiddleware;
  classes: ClassTable;
  tree?: DryadTree;
  log: Console;
  _errorLogger: Function;

  constructor(rootDryad: Dryad | null = null, layers: Layer[] = [], rootContext: Context = {}) {
    this.middleware = new CommandMiddleware([updateContext as Middleware, run as Middleware]);
    this.classes = {};
    if (layers) {
      layers.forEach(layer => this.use(layer));
    }

    if (!rootContext.log) {
      rootContext.log = console;
    }

    this.log = rootContext.log;

    // default logger
    this._errorLogger = (msg: string, error: Error) => {
      this.log.error(msg, error, error.stack);
      this.dump();
      // and emit error event
    };

    this.setRoot(rootDryad, rootContext);
  }

  /**
   * Set a new tree.
   *
   * Behavior while already playing is not yet defined.
   *
   * @param {Dryad} dryad
   */
  setRoot(dryad: Dryad | Dryad[] | null, rootContext: Context = {}): void {
    this.tree = dryad ? new DryadTree(this.h(dryad), this.getClass, rootContext) : undefined;
  }

  /**
   * Convert hyperscript graph to Dryad objects with registered classes
   *
   * @param {Object} hgraph - JSON style object
   * @returns {Dryad}
   */
  h(hgraph: Dryad | Dryad[]): Dryad {
    return hyperscript(hgraph, this.getClass);
  }

  /**
   * Add a layer of functionality by registering Dryad classes and command middleware.
   *
   * @param layer - .classes is a list of Dryad classes, .middleware is a list of middleware functions
   */
  use(layer: Layer): DryadPlayer {
    this.middleware.use(layer.middleware || []);
    (layer.classes || []).forEach(c => this.addClass(c));
    return this;
  }

  /**
   * Register a Dryad class so it can be located when used in hyperscript.
   * Also needed if a class uses requireParent()
   */
  addClass(dryadClass: DryadType): void {
    this.classes[dryadClass.name.toLowerCase()] = dryadClass;
  }

  /**
   * Lookup Dryad class by name.
   *
   * Used by hyperscript and requireParent, this requires
   * that layers and their classes were registered and any custom
   * classes that you right are registered. If you aren't using
   * hyperscript then you don't need to register your class.
   *
   * @param className - case-insensitive
   */
  getClass: GetClassFn = (className: string): DryadType => {
    const dryadClass = this.classes[className.toLowerCase()];
    if (!dryadClass) {
      throw new Error(`Dryad class not found: '${className}' in classes: ${Object.keys(this.classes).join(", ")}`);
    }
    return dryadClass;
  };

  /**
   * Prepare Dryads in document for play.
   *
   * This allocates resources and performs any time consuming async work
   * required before the Dryads may play.
   *
   * Prepare commands may fail by rejecting their Promises.
   * Unable to allocate resource, required executables do not exist etc.
   *
   * .play commands should not fail
   *
   */
  prepare(): Promise<DryadPlayer> {
    return this.call("prepareForAdd");
  }

  /**
   * Prepares and plays the current document.
   *
   * Optionally updates to a new document.
   *
   * @returns {Promise} - that resolves to `this`
   */
  async play(dryad?: Dryad): Promise<DryadPlayer> {
    if (dryad) {
      this.setRoot(dryad);
    }

    try {
      await this.prepare();
      await this.call("add");
      return this;
    } catch (error) {
      // Log the error but continue the Promise chain
      this._errorLogger("Failed to play", error);
      return Promise.reject(error);
    }
  }

  /**
   * @returns {Promise} - that resolves to `this`
   */
  async stop(): Promise<DryadPlayer> {
    try {
      await this.call("remove");
      return this;
    } catch (error) {
      this._errorLogger("Failed to stop", error);
      return Promise.reject(error);
    }
  }

  _collectCommands(commandName: string): CommandNode {
    if (this.tree && this.tree.tree) {
      return this.tree.collectCommands(commandName, this.tree.tree, this);
    }
    // no-op
    return new CommandNode({}, {}, {}, "", []);
  }

  /**
   * Collect commands and call for a transition: add|remove|prepareForAdd
   */
  async call(stateTransitionName: string): Promise<DryadPlayer> {
    const cmdTree = this._collectCommands(stateTransitionName);
    await this._call(cmdTree, stateTransitionName);
    return this;
  }

  /**
   * Execute a command tree using middleware.
   */
  async _call(commandTree: CommandNode, stateTransitionName: string): Promise<void> {
    if (this.tree) {
      await this.middleware.call(commandTree, stateTransitionName, (context, update) => {
        return this.tree ? this.tree.updateContext(context.id, update) : context;
      });
    }
  }

  /**
   * Execute a single command object for a single node using middleware
   * outside the prepareForAdd/add/remove full tree command execution routine.
   *
   * This can be called out of band from a Dryad's add/remove method
   *
   * Its for commands that need to be executed during runtime
   * in response to events, streams etc.
   * eg. spawning synths from an incoming stream of data.
   */
  async callCommand(nodeId: string, command: Command): Promise<void> {
    if (this.tree) {
      await this._call(this.tree.makeCommandTree(nodeId, command), "callCommand");
    }
  }

  /**
   * updateContext - Allow a Dryad to update its own context.
   *
   * This can be called during runtime by event handlers,
   * updates via stream etc. when you need to save new values into the context
   * outside of the add/remove/update functions.
   *
   * Contexts are immutable - this returns a new context object.
   *
   * @param  {Object} context to update
   * @param  {Object} update  updated variables
   * @return {Object}         new context object
   */
  updateContext(context: Context, update: Context): Context {
    return this.tree ? this.tree.updateContext(context.id, update) : context;
  }

  /**
   * Get a representation of current state of the tree.
   * Contains add|remove|prepared and may hold errors.
   */
  getDebugState(): DebugState {
    return this.tree ? this.tree.getDebugState() : {};
  }

  /**
   * Get hyperscript representation of current (expanded) play graph
   */
  getPlayGraph(): HyperScript | undefined {
    return this.tree && this.tree.hyperscript();
  }

  dump(): void {
    // TODO: get a better one
    function replacer(key: string, value) {
      if (typeof value === "function") {
        return String(value);
      }
      return value;
    }

    this.log.info(JSON.stringify(this.getPlayGraph(), replacer, 2));
    this.log.error(JSON.stringify(this.getDebugState(), replacer, 2));
  }
}
