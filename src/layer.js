/* @flow */
import run from './run';
import updateContext from './updateContext';

/**
 * Core middleware functionality
 *
 * At this point only 'run' but others will follow
 */
let middleware:Array<Function> = [
  run,
  updateContext
];

export default {
  middleware,
  classes: []
};
