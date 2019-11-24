import forEach from "lodash/forEach";
import isArray from "lodash/isArray";
import _isObject from "lodash/isObject";
import isPlainObject from "is-plain-object";
import Dryad from "./Dryad";
import { Properties } from "./types";

export type PropertyValueMapFunction = (value: any, key: string, path: string) => any;

type Key = string;

/**
 * Deep map Dryad property object using a function
 *
 * @param {Object} properties - a multi-leveled dictionary/Object
 * @param {Function} fn - mapping function. args: value, key, deep.dot.notation.key
 * @param {Array} _prefixKeys - for internal use in recursion only
 */
export function mapProperties(
  properties: Properties,
  fn: PropertyValueMapFunction,
  _prefixKeys: Key[] = [],
): Properties {
  const result: Properties = {};
  if (!isObject(properties)) {
    throw new Error(`Invalid type: ${typeof properties}`);
  }

  forEach(properties, (value: any, key: Key) => {
    if (isArray(value)) {
      result[key] = value.map((v, i) => {
        // if object or array then map deeper
        if (isObject(v)) {
          return mapProperties(v, fn, appendKey(_prefixKeys, `${key}.${i}`));
        } else {
          return v;
        }
      });
    } else if (isObject(value)) {
      result[key] = mapProperties(value, fn, appendKey(_prefixKeys, key));
    } else {
      result[key] = fn(value, key, concatKeys(appendKey(_prefixKeys, key)));
    }
  });
  return result;
}

function appendKey(keys: Key[], key: Key): Key[] {
  // out? like SynthDef out?
  const out = keys.slice();
  out.push(key);
  return out;
}

function concatKeys(keys: Key[]): string {
  return keys.join(".");
}

export function isDryad(value: any): boolean {
  return _isObject(value) && value instanceof Dryad;
}

/**
 * Checks if object is a plain {} object
 *
 * Not Dryad, Array, Function, number etc
 */
export function isObject(value: any): boolean {
  return isPlainObject(value);
}

export function className(dryad: Dryad): string {
  return dryad.constructor.name;
}
