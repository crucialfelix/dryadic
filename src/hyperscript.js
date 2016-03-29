
/**
 * Convert a JSON object tree into a tree of instantiated Dryads
 *
 * A Domain-specific language for easily creating Dryad trees
 *
 * className, properties:
 * ['synth', {freq: 440}]

 * className, properties, children:
 * ['audiobus', {numChannels: 2}, [
 *   ['synth', {defName: 'saw', args: {freq: 440}]
 * ]]

 * If there are only 2 items and the second is an Array (not Object),
 * then parse it as:
 *
 * className, children:
 *
 *  ['group', [
 *    ['synth', {freq: 440}]
 *  ]]
 *
 * a la: https://github.com/Raynos/virtual-hyperscript
 *
 * @param {Dryad|Array} root
 * @param {Function} lookupClassByNameFn
 * @returns {Dryad}
 */
export default function hyperscript(root, lookupClassByNameFn) {

  if (!root) {
    throw new Error('Bad argument to hyperscript: ' + root);
  }
  // if the thing implements isDryad then the answer must be yes.
  if (root.isDryad) {
    return root;
  }
  if (!Array.isArray(root)) {
    throw new Error('Malformed argument to hyperscript:' + root);
  }
  let [tag, properties, children] = root;
  if (!children && Array.isArray(properties)) {
    children = properties;
    properties = {};
  }

  // convert children
  let childNodes = (children || []).map((child) => {
    return hyperscript(child, lookupClassByNameFn);
  });

  // if the thing implements isDryadSubclass then the answer must be yes.
  // its a static method on Dryad
  let DryadClass = tag.isDryadSubclass ? tag : lookupClassByNameFn(tag);
  return new DryadClass(properties, childNodes);
}
