
jest.dontMock('../CommandMiddleware');

var CommandMiddleware = require('../CommandMiddleware').default;

describe('CommandMiddleware', function() {
  var rc = {
    commands: {action: 0},
    context: {id: 0},
    children: [
      {
        commands: {action: 1},
        context: {id: 1},
        children: []
      },
      {
        commands: {action: 2},
        context: {id: 2},
        children: [
          {
            commands: {action: 3},
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
      expect(f.command.action).toBe(i);
      expect(f.context.id).toBe(i);
    });
  });

  pit('should call a command root stack', function() {
    var cm = new CommandMiddleware();

    var middleware = function(commands) {
      var results = [];
      commands.forEach((command) => {
        results.push(command.command.action);
      });
      return Promise.all(results);
    };

    cm.use([middleware]);

    return cm.call(rc).then((returned) => {
      // [[0, 1, 2, 3]]
      // because you are returned a list for each middlware installed
      expect(returned[0].length).toBe(4);
      expect(returned[0]).toEqual([0, 1, 2, 3]);
    });
  });

});
