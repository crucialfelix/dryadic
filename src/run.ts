import { Command, Context, Properties, UpdateContext } from "./types";

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
export default async function run(
  command: Command,
  context: Context,
  properties: Properties,
  updateContext: UpdateContext,
): Promise<void> {
  if (command.run) {
    if (typeof command.run === "function") {
      await command.run(context, properties, updateContext);
    } else {
      throw new TypeError(`${command.run} is not callable`);
    }
  }
}
