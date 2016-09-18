
var updateContext = require('../updateContext').default;

describe('"updateContext" middleware', () => {
  it('should update into context', () => {
    let commands = {
        updateContext: {
          new: 'value'
        }
      };
    let context = {};
    var updates = null;

    let updater = (argContext, argCommand) => {
      // console.log({argContext, argCommand});
      updates = argCommand;
    };

    updateContext(commands, context, updater);

    expect(updates).toBeTruthy();
    expect(updates).toBe(commands.updateContext);
  });

});
