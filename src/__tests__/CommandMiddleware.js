
jest.dontMock('../CommandMiddleware');

var CommandMiddleware = require('../CommandMiddleware').default;

describe('CommandMiddleware', function() {
  var rc = {
    commands: {action: () => 0},
    context: {id: 0},
    children: [
      {
        commands: {action: () => 1},
        context: {id: 1},
        children: []
      },
      {
        commands: {action: () => 2},
        context: {id: 2},
        children: [
          {
            commands: {action: () => 3},
            context: {id: 3},
            children: []
          }
        ]
      }
    ]
  };

  it('should flatten command objects and their children to a flat list', function() {
    var cm = new CommandMiddleware();

    var flat = cm._flatten(rc);
    expect(flat.length).toBe(4);
    flat.forEach((f, i) => {
      expect(f.commands.action()).toBe(i);
      expect(f.context.id).toBe(i);
    });
  });

  pit('should call a command root stack', function() {

    var updatedContext;

    function updateContext(context, update) {
      // would write to the store
      updatedContext = update;
    }

    var middleware = function(commands, context) {
      if (commands.action) {
        return commands.action(context);
      }
    };

    var cm = new CommandMiddleware([middleware]);

    return cm.call(rc, 'add', updateContext).then((returned) => {
      // 4 undefineds
      expect(returned.length).toBe(4);
      // state was marked as updated
      expect(updatedContext).toEqual({state: {add: true}});
    });
  });

  pit('should set state error on failure', function() {

    var updatedContext;

    function updateContext(context, update) {
      // would write to the store
      updatedContext = update;
    }

    var middleware = function(commands/*, context*/) {
      if (commands.action) {
        return Promise.reject(new Error('testing deliberate failure in middleware'));
      }
    };

    var cm = new CommandMiddleware([middleware]);

    return new Promise((resolve, reject) => {
      cm.call(rc, 'add', updateContext).then(() => {
        reject(new Error('middleware should not have resolved'));
      }).catch((error) => {
        expect(updatedContext).toEqual({state: {add: false, error: error}});
        resolve();
      });
    });
  });
});
