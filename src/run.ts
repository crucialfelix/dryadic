import { Command, Context, Properties } from "./types";

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
export default function run(command: Command, context: Context, properties: Properties): void | any | Promise<any> {
  // what is the result used for ?
  // be all Promise or just await here
  if (command.run) {
    return command.run(context, properties);
  }
}
