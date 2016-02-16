import _ from 'underscore';
import DryadTree from './DryadTree';
import CommandMiddleware from './CommandMiddleware';
import {Promise} from 'bluebird';

if (process) {
  process.on('unhandledRejection', function(reason) {
    // console.error(reason);
    console.error(reason.stack);
  });
} else {
  Promise.onPossiblyUnhandledRejection((error) => {
    console.error(error);
    throw Error(error);
  });
}



export default class DryadPlayer {

  constructor(rootDryad) {
    if (rootDryad) {
      this.setRoot(rootDryad);
    }
    this.middleware = new CommandMiddleware();
    this.classes = {};
  }

  setRoot(rootDryad) {
    this.tree = new DryadTree(rootDryad, _.bind(this.getClass, this));
  }

  /**
   * Add a layer of functionality in the form of Dryad classes and command middleware
   *
   * @param {Object} layer - .classes is a list of Dryad classes, .middleware is a list of middleware functions
   */
  use(layer) {
    this.middleware.use(layer.middleware || []);
    (layer.classes || []).forEach((c) => this.addClass(c));
    return this;
  }

  addClass(dryadClass) {
    this.classes[dryadClass.name] = dryadClass;
  }

  getClass(className) {
    let dryadClass = this.classes[className];
    if (!dryadClass) {
      throw new Error('Dryad class not found: ' + className);
    }
    return dryadClass;
  }

  /**
   *
   * @returns {Promise} - that resolves to this
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
    // console.log('call commandRoot', commandRoot.children[0]);
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
