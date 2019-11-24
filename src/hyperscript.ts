import isArray from "lodash/isArray";
import isObject from "lodash/isObject";
import isString from "lodash/isString";
import mapValues from "lodash/mapValues";

import Dryad from "./Dryad";

/**
 * Convert a JSON object into a tree of instantiated Dryads.
 *
 * A Domain-specific language for easily creating Dryad trees
 * a la: https://github.com/Raynos/virtual-hyperscript
 *
 * This is used for sending tree documents from remote clients,
 * and for writing dryadic documents in JSON form without having to
 * import classes and construct trees filled with `new Object()` etc.
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
 * If a property value is of the form [string, object] or [string, object, array] then assume it is
 * a dryad.
 *
 * ['synth', {
 *    'freq': ['synth', {'defName': 'lfo', 'freq': 0.3}]
 * }]
 *
 * @param {Array|Dryad} root - The Array is the top level (root) dryad form.
 *                           If a Dryad is supplied then no conversion is needed so it is returned immediately.
 * @param {Function} lookupClassByNameFn
 *        This function is provided by the DryadPlayer and converts strings into
 *        Dryad classes. It should throw an error if no Dryad class exists by that name.
 * @returns {Dryad} - the root Dryad
 */
export default function hyperscript(root: any, lookupClassByNameFn: Function): Dryad {
  if (!root) {
    die(root, "Got null|undefined.");
  }

  // if the thing implements isDryad then the answer must be yes.
  if (root.isDryad) {
    return root;
  }

  if (!isArray(root)) {
    die(root, "Expected Array.");
  }

  // const [tag, properties, children] = root;
  const tag = root[0];
  let properties = root[1];
  let children = root[2];

  if (!tag) {
    die(root, "Null tag");
  }

  if (!(isString(tag) || tag.isDryadSubclass)) {
    die(root, "Expected tag to be string");
  }

  if (children) {
    if (!isObject(properties)) {
      die(root, "Expected properties to be an Object");
    }
    if (!isArray(children)) {
      die(root, "Expected children to be an Array");
    }
  } else {
    // If 2nd arg is an array then it is the children and there are no properties.
    if (isArray(properties)) {
      children = properties;
      properties = {};
    } else {
      if (properties && !isObject(properties)) {
        die(root, "Expected properties to be an Object");
      }
    }
  }

  // Convert any property value that looks like a hyperscript form to a Dryad
  properties = mapValues(properties || {}, value =>
    isDryadForm(value) ? hyperscript(value, lookupClassByNameFn) : value,
  );

  // Convert children
  const childNodes = (children || []).map(child => hyperscript(child, lookupClassByNameFn));

  // If the thing implements isDryadSubclass then the answer must be yes.
  // its a static method on Dryad
  const DryadClass = tag.isDryadSubclass ? tag : lookupClassByNameFn(tag);
  return new DryadClass(properties, childNodes);
}

function isDryadForm(value): boolean {
  return isArray(value) && value.length <= 3 && isString(value[0]) && isObject(value[1]);
}

function die(root: any, message: string): never {
  throw new Error(`Bad argument to hyperscript: [${typeof root}] ${root} ${message}`);
}
