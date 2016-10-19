/* @flow */
import _ from 'underscore';
import DryadTree from './DryadTree';
import CommandMiddleware from './CommandMiddleware';
import CommandNode from './CommandNode';
import { Promise } from 'bluebird';
import hyperscript from './hyperscript';
import type Dryad from './Dryad';
import updateContext from './updateContext';
import run from './run';

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
  classes: Object;
  tree: DryadTree;
  log: any;
  _errorLogger: Function;

  constructor(rootDryad:Dryad, layers:Array<Object>, rootContext:Object = {}) {
    this.middleware = new CommandMiddleware([updateContext, run]);
    this.classes = {};
    if (layers) {
      layers.forEach((layer) => this.use(layer));
    }

    if (!rootContext.log) {
      rootContext.log = console;
    }

    this.log = rootContext.log;

    // default logger
    this._errorLogger = (msg, error) => {
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
  setRoot(dryad:Dryad|Array<any>|null, rootContext:Object={}) {
    let classLookup = _.bind(this.getClass, this);
    this.tree = new DryadTree(dryad ? this.h(dryad) : null, classLookup, rootContext);
  }

  /**
   * Convert hyperscript graph to Dryad objects with registered classes
   *
   * @param {Object} hgraph - JSON style object
   * @returns {Dryad}
   */
  h(hgraph:Dryad|Array<any>) : Dryad {
    let classLookup = _.bind(this.getClass, this);
    return hyperscript(hgraph, classLookup);
  }

  /**
   * Add a layer of functionality by registering Dryad classes and command middleware.
   *
   * @param {Object} layer - .classes is a list of Dryad classes, .middleware is a list of middleware functions
   */
  use(layer:Object) : DryadPlayer {
    this.middleware.use(layer.middleware || []);
    (layer.classes || []).forEach((c) => this.addClass(c));
    return this;
  }

  /**
   * Register a Dryad class so it can be located when used in hyperscript.
   * Also needed if a class uses requireParent()
   *
   * @param {Dryad} dryadClass
   */
  addClass(dryadClass:Class<Dryad>) : void {
    this.classes[dryadClass.name.toLowerCase()] = dryadClass;
  }

  /**
   * Lookup Dryad class by name.
   *
   * Used by hyperscript and requireParent, this requires
   * that layers and their classes were registered and any custom
   * classes that you right are registered. If you aren't using
   * hyperscript then you don't need to register your class.
   * @param {String} className - case-insensitive
   * @returns {Dryad}
   */
  getClass(className:string) : Class<Dryad> {
    let dryadClass = this.classes[className.toLowerCase()];
    if (!dryadClass) {
      throw new Error(`Dryad class not found: '${className}' in classes: ${Object.keys(this.classes).join(', ')}`);
    }
    return dryadClass;
  }

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
  prepare() : Promise<DryadPlayer> {
    return this.call('prepareForAdd');
  }

  /**
   * Prepares and plays the current document.
   *
   * Optionally updates to a new document.
   *
   * @returns {Promise} - that resolves to `this`
   */
  play(dryad:?Dryad) : Promise<DryadPlayer> {
    if (dryad) {
      this.setRoot(dryad);
    }

    return this.prepare()
      .then(() => this.call('add'))
      .then(() => this, (error) => {
        // Log the error but continue the Promise chain
        this._errorLogger('Failed to play', error);
        return Promise.reject(error);
      });
  }

  /**
   * @returns {Promise} - that resolves to `this`
   */
  stop() : Promise<DryadPlayer> {
    return this.call('remove')
      .then(() => this, (error) => {
        this._errorLogger('Failed to stop', error);
        return Promise.reject(error);
      });
  }

  _collectCommands(commandName:string) : CommandNode {
    if (this.tree && this.tree.tree) {
      return this.tree.collectCommands(commandName, this.tree.tree, this);
    }
    // no-op
    return new CommandNode({}, {}, {}, '', []);
  }

  /**
   * Collect commands and call for a transition: add|remove|prepareForAdd
   */
  call(stateTransitionName:string) : Promise<DryadPlayer> {
    let cmdTree = this._collectCommands(stateTransitionName);
    return this._call(cmdTree, stateTransitionName).then(() => this);
  }

  /**
   * Execute a command tree using middleware.
   */
  _call(commandTree:CommandNode, stateTransitionName:string) : Promise {
    return this.middleware.call(commandTree,
      stateTransitionName,
      (context, update) => this.tree.updateContext(context.id, update));
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
  callCommand(nodeId:string, command:Object) : Promise {
    return this._call(this.tree.makeCommandTree(nodeId, command), 'callCommand');
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
  updateContext(context:Object, update:Object) : Object {
    return this.tree.updateContext(context.id, update);
  }

  /**
   * Get a representation of current state of the tree.
   * Contains add|remove|prepared and may hold errors.
   */
  getDebugState() : Object {
    return this.tree.getDebugState();
  }

  /**
   * Get hyperscript representation of current (expanded) play graph
   */
  getPlayGraph() : ?Array<mixed> {
    return this.tree.hyperscript();
  }

  dump() {
    // TODO: get a better one
    function replacer(key, value) {
      if (typeof value === 'function') {
        return String(value);
      }
      return value;
    }

    this.log.info(JSON.stringify(this.getPlayGraph(), replacer, 2));
    this.log.error(JSON.stringify(this.getDebugState(), replacer, 2));
  }
}
