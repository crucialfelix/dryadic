/* @flow */
/**
 * Updates the player's context using DryadTree.updateContext
 *
 * Usage:
 *
 *  add() {
 *   return {
 *    updateContext: {
 *      key: 'value'
 *    }
 *   };
 *  }
 *
 * Most useful for event handling to save new state.
 */
export default function updateContext(command:Object, context:Object, updater:Function) {
  if (command.updateContext) {
    updater(context, command.updateContext);
  }
}
