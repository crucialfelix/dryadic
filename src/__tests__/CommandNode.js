/* @flow */

import * as _ from 'underscore';
import CommandNode, { CALL_ORDER } from '../CommandNode';

describe('CommandNode', function() {

  const middleware = function(commands, context, properties/*, updateFn*/) {
    if (commands.action) {
      return commands.action(context, properties);
    }
  };

  const updater = _.assign;

  // execute
  describe('execute', function() {
    let n = new CommandNode(
      {action: () => 0},
      {id: '0'},
      {key: 'value'},
      '0',
      []);

    it('should execute commands', function() {
      return n.execute('add', [middleware], updater)
        .then((got) => {
          // undefined because they don't return anything
          // they just execute
          expect(got).toBe(undefined);
          expect(n.context.state).toEqual({add: true});
        });
    });

  });

  describe('callOrder', function() {
    /**
     * Test the various callOrder modes.
     *
     * The command returns a Promise that resolves
     * after a few milliseconds. This tests that
     * the sequence of calls is correct.
     */

    function make(callOrder) {
      // action pushes the id to calls
      var a, b, c;
      let calls = [];
      // create a function that returns a Promise, resolved after ms delay
      let actionary = (ms) => {
        return (context) => {
          calls.push(context.id);
          return new Promise((resolve) => _.delay(resolve, ms));
        };
      };

      // in properties mode this is called before c
      // and c will not be called till it completes
      b = new CommandNode(
        {action: actionary(100)},
        {id: 'b'},
        {},
        'b',
        []);

      c = new CommandNode(
        {action: actionary(50)},
        {id: 'c'},
        {},
        'c',
        []);

      // a is called first, the other ones must wait
      a = new CommandNode(
        {
          action: actionary(200),
          callOrder
        },
        {id: 'a'},
        {},
        'a',
        [b, c]);

      return [a, b, c, calls];
    }

    describe('default order', function() {
      let [a, b, c, calls] = make();  // eslint-disable-line no-unused-vars

      return it('should call a b c', function() {
        return a.call('add', [middleware], _.assign).then(() => {
          expect(calls).toEqual(['a', 'b', 'c']);
        });
      });
    });

    describe('SELF_THEN_CHILDREN', function() {
      let [a, b, c, calls] = make(CALL_ORDER.SELF_THEN_CHILDREN);  // eslint-disable-line no-unused-vars

      return it('should call a b c', function() {
        return a.call('add', [middleware], _.assign).then(() => {
          expect(calls).toEqual(['a', 'b', 'c']);
        });
      });
    });

    describe('PROPERTIES_MODE', function() {
      let [a, b, c, calls] = make(CALL_ORDER.PROPERTIES_MODE);  // eslint-disable-line no-unused-vars

      return it('should call a b c', function() {
        return a.call('add', [middleware], _.assign).then(() => {
          expect(calls).toEqual(['a', 'b', 'c']);
        });
      });
    });
  });

});
