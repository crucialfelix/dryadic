
/**
 * >> A dryad (/ˈdraɪ.æd/; Greek: Δρυάδες, sing.: Δρυάς) is a tree nymph, or female tree spirit, in Greek mythology
 *
 * A Dryad is a component for managing the creation and control of something.
 * For instance that 'something' could be a SuperCollider Synth, or a MIDI connection, SVG or Canvas in a webrowser,
 * a datasource, a web resource to fetch or an external process.
 *
 * It is anything that you want to specify parameters for and then create according to those parameters.
 *
 */
import * as _  from 'underscore';


export default class Dryad {

  constructor(properties={}, children=[]) {
    this.properties = _.assign({}, this.defaultProperties(), properties);
    this.children = children;
    this.tag = null;
  }

  defaultProperties() {
    return {};
  }
  prepareForAdd() {
    return {};
  }
  add() {
    return {};
  }
  remove() {
    return {};
  }
  subgraph() {}
  requireParent() {}
  childContext() {
    return {};
  }
  get isDryad() {
    return true;
  }

  clone() {
    let dup = new this.constructor();
    let cloneValue = (c) => (c && c.isDryad) ? c.clone() : _.clone(c);
    dup.properties = _.mapObject(this.properties, cloneValue);
    dup.children = this.children.map(cloneValue);
    return dup;
  }
}
