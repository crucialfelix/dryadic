import DryadPlayer from './DryadPlayer';
import layer from './layer';

/**
 * Short cut to create a DryadPlayer from a root Dryad
 * optionally adding some layers.
 *
 * @param {Dryad} dryad
 * @param {Array} layers
 * @returns {DryadPlayer}
 */
export default function dryadic(dryad, moreLayers=[]) {
  return new DryadPlayer(dryad, [layer].concat(moreLayers));
}
