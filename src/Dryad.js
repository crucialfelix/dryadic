/* @flow */
import * as _  from 'underscore';

/**
 * >> A dryad (/ˈdraɪ.æd/; Greek: Δρυάδες, sing.: Δρυάς) is a tree nymph, or female tree spirit, in Greek mythology
 *
 * A Dryad is a component for managing the creation and control of something.
 *
 * For instance that 'something' could be a SuperCollider Synth, or a MIDI connection, SVG or Canvas in a webrowser,
 * a datasource, a web resource to fetch or an external process.
 *
 * It is anything that you want to specify parameters for and then create according to those parameters.
 *
 * Dryads have properties and children but do not hold any internal state.
 * Their methods are passed a context object and they perform their functionality
 * based on their properties (what they are supposed to be / to do) and the context
 * which holds the state, temporary variables they need for operation (like supercollider node ids) and gives them access to variables defined by parent nodes in the play graph.
 *
 * They provide functionality by return command objects which are processed by
 * command middleware which is supplied by various Dryadic packages.
 */


export default class Dryad {

  properties: Object;
  children: Array<Dryad>;
  tag: ?string;

  /**
   * Subclasses should not implement constructor.
   * All Dryad classes take properties and children.
   */
  constructor(properties:Object={}, children:Array<Dryad>=[]) {
    this.properties = _.assign({}, this.defaultProperties(), properties || {});
    this.children = children || [];
    this.tag = null;
  }

  /**
   * Defaults properties if none are supplied
   */
  defaultProperties() : Object {
    return {};
  }

  /**
   * Returns a command object or a function that is called with node context and will return a command object.
   *
   * Values of the command objects are functions may return Promises,
   * and may reject those promises which will halt the .add() operation

   * The function is called with the node's context
   *
   * Middleware supplied by layers will match command keys and will be passed the value.
   * Value is either an object that the middleware uses to do whatever it does (launch things, send messages) or is a function that take context and returns the object.
   */
  prepareForAdd(/*player:DryadPlayer*/) : Object {
    return {};
  }

  /**
   * Add the Dryad, make it play, make it start etc.
   *
   * Returns a command object or a function that is called with node context and will return a command object.
   *
   * Middleware supplied by layers will match command keys and will be passed the value.
   * Value is either an object that the middleware uses to do whatever it does (launch things, send messages) or is a function that take context and returns the object.
   *
   * Command middleware for add may return Promises which resolve on success; ie. when the thing is successfully booted, running etc.
   */
  add(/*player*/) : Object {
    return {};
  }

  /**
   * Remove the Dryad, make it stop etc.
   *
   * Returns a command object or a function that is called with node context and will return a command object.
   *
   * Middleware supplied by layers will match command keys and will be passed the value.
   * Value is either an object that the middleware uses to do whatever it does (launch things, send messages) or is a function that take context and returns the object.
   *
   * Command middleware for run may return Promises which resolve on success; ie. when the thing is successfully stopped, remove etc.
   */
  remove(/*player*/) : Object {
    return {};
  }

  /**
   * Dryad classes may return a subgraph of Dryads to replace itself
   * in the play graph.
   * This lets Dryads compose more complex behavior, add other Dryads that
   * assist. Any Dryads supplied in properties should be included in the subgraph.
   *
   * The subgraph may also contain the Dryad itself in which case its .add .remove
   * will be called. If subgraph is implemented but it does not include itself then
   * .add / .remove will not be called.
   */
  subgraph() : ?Dryad {}

  /**
   * When Dryad requires a parent Dryad to be somewhere above it then it
   * may be specified by its class name here and the parent will be injected
   * into the playgraph. This is similar to subgraph() but make it easy to
   * do and is less error prone.
   *
   * Example: SCSynthDef compiles SynthDefs from source code and requires a supercollider SCLang interpreter as a parent to do that compilation. If there is not already an SCLang in the play graph then include one.
   *
   * @returns {String|undefined} - class name of required parent Dryad
   */
  requireParent() : ?string {}

  /**
   * Initial context
   *
   * This dryad's context is also the parent object for all children.
   */
  initialContext() : Object {
    return {};
  }

  /**
   * Context for child; used when creating initial context for a node
   *
   * Note that the child already inherits from this context.
   *
   * will deprecate this. nothing is using it
   * @deprecated
   */
  childContext() : Object {
    return {};
  }

  /**
   * This method is never actually called, but merely because its implemented
   * (dryad.isDryad is not undefined) it marks the things as being a Dryad.
   *
   * @returns {Boolean}
   */
  get isDryad() : boolean {
    return true;
  }

  /**
   * This method is never actually called, but merely because its implemented
   * (MyDryad.isDryadSubclass is not undefined) it marks the thing as being a Dryad subclass.
   *
   * @returns {Boolean}
   */
  static isDryadSubclass() : boolean {
    return true;
  }

  clone() : Dryad {
    let dup = new this.constructor();
    let cloneValue = (c) => (c && c.isDryad) ? c.clone() : _.clone(c);
    dup.properties = _.mapObject(this.properties, cloneValue);
    dup.children = this.children.map(cloneValue);
    return dup;
  }
}
