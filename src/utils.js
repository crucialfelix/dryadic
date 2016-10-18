/* @flow */
import * as _ from 'underscore';
import isPlainObject from 'is-plain-object';
import type Dryad from './Dryad';

/**
 * Deep map Dryad property object using a function
 *
 * @param {Object} properties - a multi-leveled dictionary/Object
 * @param {Function} fn - mapping function. args: value, key, deep.dot.notation.key
 * @param {Array} _prefixKeys - for internal use in recursion only
 */
export function mapProperties(properties:Object, fn:Function, _prefixKeys:Array<string>=[]) : Object {
  const result = {};
  if (!isObject(properties)) {
    throw new Error(`Invalid type: ${typeof properties}`);
  }

  _.each(properties, (value:any, key:string) => {
    if (_.isArray(value)) {
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


function appendKey(keys:Array<string>, key:string) : Array<string> {
  const out = keys.slice();
  out.push(key);
  return out;
}


function concatKeys(keys:Array<string>) : string {
  return keys.join('.');
}


export function isDryad(value:any) : boolean {
  return _.isObject(value) && (value.isDryad ? true : false);
}


/**
 * Checks if object is a plain {} object
 *
 * Not Dryad, Array, Function, number etc
 */
export function isObject(value:any) : boolean {
  return isPlainObject(value);
}


export function className(dryad:Dryad) : string {
  return dryad.constructor.name;
}
