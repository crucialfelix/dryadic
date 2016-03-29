import _ from 'underscore';
import DryadTree from './DryadTree';
import CommandMiddleware from './CommandMiddleware';
import {Promise} from 'bluebird';
import hyperscript from './hyperscript';

if (process) {
  process.on('unhandledRejection', function(reason) {
    console.error('Unhandled Rejection:', reason, reason && reason.stack);
  });
} else {
  Promise.onPossiblyUnhandledRejection((error) => {
    console.error(error);
    throw Error(error);
  });
}



export default class DryadPlayer {

  constructor(rootDryad, layers) {
    this.middleware = new CommandMiddleware();
    this.classes = {};
    if (layers) {
      layers.forEach((layer) => {
        this.use(layer);
      });
    }
    this.setRoot(rootDryad);
  }

  /**
   * Set a new tree.
   *
   * Behavior while already playing is not yet defined.
   *
   * @param {Dryad} dryad
   */
  setRoot(dryad) {
    if (dryad) {
      let classLookup = _.bind(this.getClass, this);
      this.tree = new DryadTree(this.h(dryad), classLookup);
    } else {
      this.tree = null;
    }
  }

  h(hgraph) {
    let classLookup = _.bind(this.getClass, this);
    return hyperscript(hgraph, classLookup);
  }

  /**
   * Add a layer of functionality by registering Dryad classes and command middleware.
   *
   * @param {Object} layer - .classes is a list of Dryad classes, .middleware is a list of middleware functions
   */
  use(layer) {
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
  addClass(dryadClass) {
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
  getClass(className) {
    let dryadClass = this.classes[className.toLowerCase()];
    if (!dryadClass) {
      throw new Error(`Dryad class not found: '${className}' in classes: ${Object.keys(this.classes)}`);
    }
    return dryadClass;
  }

  /**
   * @returns {Promise} - that resolves to `this`
   */
  play(dryad) {
    if (dryad) {
      this.setRoot(dryad);
    }
    let prepRoot = this._collect('prepareForAdd');
    let addRoot = this._collect('add');
    return this._callPrepare(prepRoot)
      .then(() => this._call(addRoot))
      .then(() => this);
  }

  /**
   * @returns {Promise} - that resolves to `this`
   */
  stop() {
    let removeRoot = this._collect('remove');
    return this._call(removeRoot).then(() => this);
  }

  _collect(commandName) {
    return this.tree.collectCommands(commandName, this.tree.tree);
  }

  _callPrepare(prepRoot) {
    var commands = prepRoot.commands || {};
    if (_.isFunction(commands)) {
      commands = commands(prepRoot.context);
    }
    return callAndResolveValues(commands, prepRoot.context).then((resolved) => {
      // save resolved to that node's context
      this.tree.updateContext(prepRoot.id, resolved);
      let childPromises = prepRoot.children.map((childPrep) => this._callPrepare(childPrep));
      return Promise.all(childPromises);
    });
  }

  _call(commandRoot) {
    return this.middleware.call(commandRoot);
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
function callAndResolveValues(commands, context) {
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
