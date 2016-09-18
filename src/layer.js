
import run from './run';
import updateContext from './updateContext';

/**
 * Core middleware functionality
 *
 * At this point only 'run' but others will follow
 */
export default {
  middleware: [
    run,
    updateContext
  ],
  classes: []
};
