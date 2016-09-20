/* @flow */
import _ from 'underscore';
import DryadTree from './DryadTree';
import CommandMiddleware from './CommandMiddleware';
import {Promise} from 'bluebird';
import hyperscript from './hyperscript';
import type Dryad from './Dryad';

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
    this.middleware = new CommandMiddleware();
    this.classes = {};
    if (layers) {
      layers.forEach((layer) => {
        this.use(layer);
      });
    }

    if (!rootContext.log) {
      rootContext.log = console;
    }

    this.log = rootContext.log;

    this._errorLogger = (msg, error) => {
      this.log.error(msg, error, error.stack);
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
   * Plays the current document.
   * Optionally updates to a new document.
   *
   * @returns {Promise} - that resolves to `this`
   */
  play(dryad:?Dryad) : Promise<DryadPlayer> {
    if (dryad) {
      this.setRoot(dryad);
    }

    let prepTree = this._collectCommands('prepareForAdd');
    let addTree = this._collectCommands('add');
    return this._callPrepare(prepTree)
      .then(() => this._call(addTree, 'add'))
      .then(() => this, (error) => {
        // log the error but continue the Promise chain
        this._errorLogger('Failed to play', error);
        return Promise.reject(error);
      });
  }

  /**
   * @returns {Promise} - that resolves to `this`
   */
  stop() : Promise<DryadPlayer> {
    let removeTree = this._collectCommands('remove');
    return this._call(removeTree, 'remove')
      .then(() => this, (error) => {
        this._errorLogger('Failed to stop', error);
        return Promise.reject(error);
      });
  }

  _collectCommands(commandName:string) : Object {
    if (this.tree) {
      return this.tree.collectCommands(commandName, this.tree.tree, this);
    }
    return {};
  }

  /**
   * Execute a prepareForAdd tree of command objects.
   *
   * Values of the command objects are functions may return Promises.
   *
   * @param {Object} prepTree - id, commands, context, children
   * @returns {Promise} - resolves when all Promises in the tree have resolved
   */
  _callPrepare(prepTree:Object) : Promise {
    var commands = prepTree.commands || {};
    if (_.isFunction(commands)) {
      commands = commands(prepTree.context);
    }
    return callAndResolveValues(commands, prepTree.context).then((resolved) => {
      // save resolved to that node's context
      // and mark that its $prepared: true for debugging
      this.updateContext(prepTree.context, _.assign({state: {prepare: true}}, resolved));
      let childPromises = prepTree.children.map((childPrep) => this._callPrepare(childPrep));
      return Promise.all(childPromises);
    }, (error) => {
      this.updateContext(prepTree.context, {state: {prepare: false, error: error}});
      return Promise.reject(error);
    });
  }

  /**
   * Execute a command tree using middleware.
   *
   * @returns {Promise}
   */
  _call(commandTree:Object, stateTransitionName:string) : Promise {
    const updateContext = (context, update) => this.tree.updateContext(context.id, update);
    return this.middleware.call(commandTree, stateTransitionName, updateContext);
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
}


/**
 * Returns a new object with each value mapped to the called-and-resolved value.
 *
 * For each key/value in commands object,
 * if value is a function then call it
 * if result is a Promise then resolve it.
 *
 * @private
 * @param {Object} commands
 * @returns {Object}
 */
function callAndResolveValues(commands:Object, context:Object) : Object {
  if (_.isEmpty(commands)) {
    return Promise.resolve({});
  }
  const keys = _.keys(commands);
  return Promise.map(keys, (key) => {
    let value = commands[key];
    return Promise.resolve(_.isFunction(value) ? value(context) : value);
  }).then((values) => {
    let result = {};
    keys.forEach((key, i) => {
      result[key] = values[i];
    });
    return result;
  });
}
