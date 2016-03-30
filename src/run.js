
/**
 * Calls a function, supplying the Dryad's context.
 * May return a Promise for success/failure
 *
 * Usage:
 *
 *  add() {
 *   return {
 *    run: (context) => {
 *       return new Promise((resolve, reject) => {
 *        // do something async like start a process,
 *        // fetch an image etc.
 *        // Dryad's properties: this.properties
 *        // Dryad's runtime context: context
 *        // on success call:
 *         resolve();
 *       });
 *     }
 *   };
 *  }
 */
export default function run(stack) {
  let results = [];
  stack.forEach((commandContext) => {
    if (commandContext.command.run) {
      results.push(commandContext.command.run(commandContext.context));
    }
  });
  return Promise.all(results);
};
