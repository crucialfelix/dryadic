
var updateContext = require('../updateContext').default;

describe('"updateContext" middleware', () => {

  pit('should update into context', () => {
    let values = {
      new: 'value'
    };

    let commands = {
      updateContext: (/*context*/) => {
        return values;
      }
    };
    let context = {};
    let properties = {};
    var updates = null;

    let updater = (argContext, argCommand) => {
      // console.log({argContext, argCommand});
      updates = argCommand;
    };

    return updateContext(commands, context, properties, updater)
      .then(() => {
        expect(updates).toEqual(values);
      });
  });

});

// call it with a function or just a plain object
