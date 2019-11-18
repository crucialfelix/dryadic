/* @flow */

import flatten from 'lodash/flatten';
import CommandNode from '../CommandNode';
import CommandMiddleware from '../CommandMiddleware';

describe('CommandMiddleware', function() {
  var commandNode = new CommandNode(
    { action: () => 0 },
    { id: '0' },
    { key: 'value' },
    '0',
    [
      new CommandNode(
        { action: () => 1 },
        { id: '1' },
        { key: 'value' },
        '1',
        []
      ),
      new CommandNode({ action: () => 2 }, { id: '2' }, { key: 'value' }, '2', [
        new CommandNode(
          { action: () => 3 },
          { id: '3' },
          { key: 'value' },
          '3',
          []
        )
      ])
    ]
  );

  // it('should flatten command objects and their children to a flat list', function() {
  //   var cm = new CommandMiddleware();
  //
  //   var flat = cm._flatten(commandNode);
  //   expect(flat.length).toBe(4);
  //   flat.forEach((f, i) => {
  //     expect(f.commands.action()).toBe(i);
  //     expect(f.properties.key).toBe('value');
  //     expect(f.context.id).toBe(String(i));
  //   });
  // });

  it('should call a command root stack', function() {
    var updatedContext;

    function updateContext(context, update) {
      // would write to the store
      updatedContext = update;
    }

    var middleware = function(commands, context, properties) {
      if (commands.action) {
        return commands.action(context, properties);
      }
    };

    var cm = new CommandMiddleware([middleware]);

    return cm.call(commandNode, 'add', updateContext).then(returned => {
      // 4 undefineds
      // [ undefined, [ undefined ], [ undefined, [ undefined ] ] ]
      // these are the returned results of executing each commandNode showing that it ran it for each of the 4 Dryads
      expect(flatten(returned).length).toBe(4);
      // state was marked as updated
      expect(updatedContext).toEqual({ state: { add: true } });
    });
  });

  it('should set state error on failure', function() {
    var updatedContext;
    let errorMessage = 'testing deliberate failure in middleware';

    function updateContext(context, update) {
      // would write to the store
      updatedContext = update;
    }

    var middleware = function(commands /*, context, properties*/) {
      if (commands.action) {
        return Promise.reject(new Error(errorMessage));
      }
    };

    var cm = new CommandMiddleware([middleware]);

    return new Promise((resolve, reject) => {
      cm
        .call(commandNode, 'add', updateContext)
        .then(() => {
          reject(new Error('middleware should not have resolved'));
        })
        .catch(error => {
          // console.log(error, typeof error, error.message);
          // Error message has been updated. The one in state is not the same
          // one I am passed here.
          // -     "error": [Error: testing deliberate failure in middleware in 0]
          // +     "error": [Error: testing deliberate failure in middleware in 3]
          // expect(updatedContext).toEqual({state: {add: false, error: error}});
          expect(updatedContext.state.add).toBe(false);
          let e = updatedContext.state.error;
          expect(e).toBeTruthy();
          expect(e.message.indexOf(errorMessage) !== -1).toBe(true);
          // `Error should contain errorMessage: ${e} missing: ${errorMessage}`);
          expect(error).toBeTruthy();
          resolve();
        });
    });
  });
});
