import updateContext from "../updateContext";

describe('"updateContext" middleware', () => {
  it("should update into context", () => {
    const values = {
      new: "value",
    };

    const commands = {
      updateContext: (/*context*/) => {
        return values;
      },
    };
    const context = {};
    const properties = {};
    let updates = null;

    const updater = (argContext, argCommand) => {
      // console.log({argContext, argCommand});
      updates = argCommand;
    };

    return updateContext(commands, context, properties, updater).then(() => {
      expect(updates).toEqual(values);
    });
  });
});

// call it with a function or just a plain object
