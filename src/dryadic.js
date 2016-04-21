import DryadPlayer from './DryadPlayer';
import layer from './layer';

/**
 * Short cut to create a DryadPlayer from a root Dryad
 * optionally adding some layers.
 *
 * @param {Dryad} dryad - Root Dryad of the tree
 * @param {Array} layers - implementation layers with Dryad classes and middleware
 * @param {Object} rootContext - optional context to supply such as log: winston logger
 * @returns {DryadPlayer}
 */
export default function dryadic(dryad, moreLayers=[], rootContext={}) {
  return new DryadPlayer(dryad, [layer].concat(moreLayers), rootContext);
}
