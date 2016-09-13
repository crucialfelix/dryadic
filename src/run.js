
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
export default function run(command, context) {
  if (command.run) {
    return command.run(context);
  }
}
