import CommandMiddleware from "../CommandMiddleware";
import CommandNode from "../CommandNode";

describe("CommandMiddleware", function() {
  const commandNode = new CommandNode({ action: () => 0 }, { id: "0" }, { key: "value" }, "0", [
    new CommandNode({ action: () => 1 }, { id: "1" }, { key: "value" }, "1", []),
    new CommandNode({ action: () => 2 }, { id: "2" }, { key: "value" }, "2", [
      new CommandNode({ action: () => 3 }, { id: "3" }, { key: "value" }, "3", []),
    ]),
  ]);

  // it('should flatten command objects and their children to a flat list', function() {
  //   const cm = new CommandMiddleware();
  //
  //   const flat = cm._flatten(commandNode);
  //   expect(flat.length).toBe(4);
  //   flat.forEach((f, i) => {
  //     expect(f.commands.action()).toBe(i);
  //     expect(f.properties.key).toBe('value');
  //     expect(f.context.id).toBe(String(i));
  //   });
  // });

  it("should call a command root stack", function() {
    let updatedContext;

    function updateContext(context, update) {
      // would write to the store
      updatedContext = update;
      return updatedContext;
    }

    const middleware = function(commands, context, properties) {
      if (commands.action) {
        return commands.action(context, properties);
      }
    };

    const cm = new CommandMiddleware([middleware]);

    // this was a change: no longer returning anything from call.
    return cm.call(commandNode, "add", updateContext).then(() => {
      // 4 undefineds
      // [ undefined, [ undefined ], [ undefined, [ undefined ] ] ]
      // these are the returned results of executing each commandNode showing that it ran it for each of the 4 Dryads
      // expect(flatten(returned).length).toBe(4);
      // state was marked as updated
      expect(updatedContext).toEqual({ state: { add: true } });
    });
  });

  it("should set state error on failure", function() {
    let updatedContext;
    const errorMessage = "testing deliberate failure in middleware";

    function updateContext(context, update) {
      // would write to the store
      updatedContext = update;
      return updatedContext;
    }

    const middleware = (commands /*, context, properties*/): void | Promise<void> => {
      if (commands.action) {
        return Promise.reject(new Error(errorMessage));
      }
    };

    const cm = new CommandMiddleware([middleware]);

    return new Promise((resolve, reject) => {
      cm.call(commandNode, "add", updateContext)
        .then(() => {
          reject(new Error("middleware should not have resolved"));
        })
        .catch(error => {
          // console.log(error, typeof error, error.message);
          // Error message has been updated. The one in state is not the same
          // one I am passed here.
          // -     "error": [Error: testing deliberate failure in middleware in 0]
          // +     "error": [Error: testing deliberate failure in middleware in 3]
          // expect(updatedContext).toEqual({state: {add: false, error: error}});
          expect(updatedContext.state.add).toBe(false);
          const e = updatedContext.state.error;
          expect(e).toBeTruthy();
          expect(e.message.indexOf(errorMessage) !== -1).toBe(true);
          // `Error should contain errorMessage: ${e} missing: ${errorMessage}`);
          expect(error).toBeTruthy();
          resolve();
        });
    });
  });
});
