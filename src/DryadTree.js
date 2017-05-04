/* @flow */
import assign from 'lodash/assign';
import clone from 'lodash/clone';
import create from 'lodash/create';
import find from 'lodash/find';
import isFunction from 'lodash/isFunction';

import { invertDryadicProperties } from './Properties';
import { mapProperties, className } from './utils';
import CommandNode from './CommandNode';
import type Dryad from './Dryad';
import type DryadPlayer from './DryadPlayer';

/**
 * Manages the tree structure, contexts for nodes,
 * utilities to walk the tree, collect commands and
 * call command middleware.
 */
export default class DryadTree {
  root: ?Dryad;
  tree: ?TreeNode;
  dryads: { [id: string]: Dryad };
  contexts: { [id: string]: Object };
  getClass: Function;
  rootContext: Object;
  nodeLookUp: Map<string, TreeNode>;

  /**
   * @param {Dryad} rootDryad
   * @param {Function} getClass - lookup function
   */
  constructor(rootDryad: ?Dryad, getClass: Function, rootContext: Object = {}) {
    this.root = rootDryad;
    this.dryads = {};
    this.contexts = {};
    this.getClass = getClass;
    this.rootContext = rootContext;
    // keep a flat lookup table
    this.nodeLookUp = new Map();
    // tree structure
    if (this.root) {
      this.tree = this._makeTree(this.root);
      this.walk((node: TreeNode) => this.nodeLookUp.set(node.id, node));
    }
  }

  /**
   * Depth first traversal of the Dryad tree
   *
   * The function is given arguments:
   *   node {id type children}
   *   Dryad
   *   context
   *   memo
   *
   * @param {Function} fn - called with (dryad, context, node)
   * @param {TreeNode} node - starting node, defaults to the root
   * @param {Object} memo - for usage during recursion
   */
  walk(fn: Function, node: ?TreeNode, memo: Object = {}): Object {
    if (!node) {
      node = this.tree;
    }

    if (node) {
      memo = fn(node, this.dryads[node.id], this.contexts[node.id], memo);
      node.children.forEach((child: TreeNode) => {
        memo = this.walk(fn, child, memo);
      });
    }

    return memo;
  }

  /**
   * Collect a tree of command objects from each node for a given method.
   * eg. 'add' 'remove' 'prepareForAdd'
   *
   * @param {String} stateTransitionName
   * @param {TreeNode} node - default is the root
   * @returns {CommandNode}
   */
  collectCommands(
    stateTransitionName: string,
    node: TreeNode,
    player: DryadPlayer
  ): CommandNode {
    let dryad = this.dryads[node.id];
    let context = this.contexts[node.id];

    let commands: ?Object;
    try {
      switch (stateTransitionName) {
        case 'prepareForAdd':
          commands = dryad.prepareForAdd(player);
          break;
        case 'add':
          commands = dryad.add(player);
          break;
        case 'remove':
          commands = dryad.remove(player);
          break;
        // case 'callCommands'
        default:
          throw new Error(`Unsupported command ${stateTransitionName}`);
      }
    } catch (error) {
      player.log
        .log(`Error during collectCommands "${stateTransitionName}" for node:\n`);
      player.log.log(node);
      throw error;
    }

    return new CommandNode(
      commands,
      context,
      dryad.properties,
      node.id,
      node.children.map(child =>
        this.collectCommands(stateTransitionName, child, player)
      )
    );
  }

  /**
   * Construct a command tree for a single commandObject to be executed
   * with a single node's context.
   *
   * This is for runtime execution of commands,
   * called from streams and async processes initiated during Dryad's .add()
   */
  makeCommandTree(nodeId: string, commands: Object): Object {
    return new CommandNode(
      commands,
      this.contexts[nodeId],
      this.dryads[nodeId].properties,
      nodeId,
      []
    );
  }

  /**
   * For any properties that are functions, call them with context to get the 'value'.
   * These converted/resolved values are passed into the commands at prepareForAdd/add etc.
   */
  dryadProperties(nodeId: string): Object {
    let dryad = this.dryads[nodeId];
    let context = this.contexts[nodeId];
    // invertDryadicProperties replaces Dryads in properties with these accessor functions
    return mapProperties(dryad.properties, (value): any => {
      return isFunction(value) ? value(context) : value;
    });
  }

  /**
   * Update a Dryad's context.
   *
   * @param {String} dryadId
   * @param {Object} update - values to assign into context
   * @returns {Object} context
   */
  updateContext(dryadId: string, update: Object): Object {
    return assign(this.contexts[dryadId], update);
  }

  getContext(dryadId: string): Object {
    return this.contexts[dryadId];
  }

  /**
   * Get a representation of current state of the tree.
   * Contains add|remove|prepared and may hold errors.
   */
  getDebugState(): Object {
    const formatState = s => {
      if (!s) {
        return s;
      }

      if (s.error) {
        return `ERROR: ${s.error}`;
      }

      if (s.add) {
        return 'running';
      }

      if (s.remove) {
        return 'removed';
      }

      if (s.prepareForAdd) {
        return 'prepared';
      }

      return `Unknown: ${JSON.stringify(s)}`;
    };

    const dbug = node => {
      let context = this.contexts[node.id];
      let state = context.hasOwnProperty('state') ? context.state : undefined;
      let r = {
        id: node.id,
        class: this.dryads[node.id].constructor.name,
        state: formatState(state)
        // circular references, cannot print
        // context: JSON.stringify(this.contexts[node.id], null, 2)
      };
      if (node.children.length) {
        r = assign(r, { children: node.children.map(dbug) });
      }
      return r;
    };

    if (this.tree) {
      return dbug(this.tree);
    } else {
      return {};
    }
  }

  /**
   * Return the current play graph as a hyperscript document.
   * Useful for testing and debugging.
   */
  hyperscript(): ?Array<mixed> {
    function asH(node) {
      let dryad = node.dryad;
      return [
        className(dryad),
        dryad.properties, // may contain accessor functions
        node.children.map(asH)
      ];
    }

    if (this.tree) {
      return asH(this.tree);
    }
  }

  /**
   * Create and return initial context for a Dryad.
   *
   * Each context has the parent's context as its prototype,
   * so parent values are visible to children.
   *
   * @returns {Object}
   */
  _createContext(
    dryad: Dryad,
    dryadId: string,
    parentId: ?string,
    rootContext: Object = {}
  ): Object {
    let cc = assign({ id: dryadId }, rootContext, dryad.initialContext());
    if (parentId) {
      let parent = this.dryads[parentId];
      // In the case of a Properties at the top level, there is no existing parent although there was a parentId of '0'
      // passed in.
      let parentContext = this.contexts[parentId];
      if (parentContext) {
        let childContext = parent.childContext(parentContext);
        return create(parentContext, assign(childContext, cc));
      }
    }
    return cc;
  }

  /**
   * Creates the expanded play graph as a tree of TreeNodes.
   *
   * It is called initially with the root Dryad, then recursively for each child down the tree.
   *
   * - Generates ids for each Dryad
   * - Creates a context for each, storing in this.contexts
   *
   * Each node in the tree contains a TreeNode
   *
   * Dryad classes may use requireParent() and subgraph() to replace themselves
   * with a different graph.
   *
   * So this tree is not a direct mapping of the input graph, it is the expanded play graph.
   *
   * This method calls itself recursively for children.
   *
   * @param {Dryad} dryad
   * @param {String} parentId
   * @param {Integer} childIndex
   * @param {Object} memo - for internal usage during recursion
   * @returns {Object}
   */
  _makeTree(
    dryad: Dryad,
    parentId: ?string,
    childIndex: number | string = 0,
    memo: Object = {}
  ): TreeNode {
    if (!dryad.isDryad) {
      throw new Error('Not a Dryad: ${dryad}');
    }

    // Copy seenTypes, pass it to your children
    // Each branch sees a different descendent list
    memo.seenTypes = memo.seenTypes ? memo.seenTypes.slice() : [];

    if (memo.skipRequireParentOf === dryad) {
      delete memo.skipRequireParentOf;
    } else {
      let rq = dryad.requireParent();
      if (rq) {
        if (!find(memo.seenTypes, st => st === rq)) {
          // fetch the parent class from dryadTypes registery by name
          if (!this.getClass) {
            throw new Error(
              'A getClass lookup was not provided to DryadTree and ' +
                dryad.constructor.name +
                ' needs one for requireParent()'
            );
          }
          let requiredParent: Dryad = new (this.getClass(rq))({}, [dryad]);
          memo.skipRequireParentOf = dryad;
          return this._makeTree(requiredParent, parentId, childIndex, memo);
        }
      }
    }

    let id = parentId ? parentId + '.' + childIndex : '0';

    // If any properties are Dryads then clone them into a Properties
    // dryad with this dryad as it's downstream child. This puts them
    // higher up in the play graph.
    let propertiesDryad = invertDryadicProperties(dryad);
    if (propertiesDryad) {
      return this._makeTree(
        propertiesDryad,
        parentId,
        `${childIndex}.props`,
        memo
      );
    }

    let context = this._createContext(dryad, id, parentId, this.rootContext);
    this.dryads[id] = dryad;
    this.contexts[id] = context;

    let makeSubgraph = dr => {
      let subgraph = dr.subgraph();
      if (subgraph) {
        let subMemo = clone(memo);
        // When and if this dryad appears in its own subgraph
        // then do not call subgraph() on that. It will just
        // do prepare/add/remove on its own self.
        subMemo.skipSubgraphOf = dryad;
        // if its an array then should have been supplied in a Branch
        if (Array.isArray(subgraph)) {
          throw new Error(
            'Dryad subgraph should return a single Dryad with children. ${dr} ${subgraph}'
          );
        }

        return this._makeTree(subgraph, id, 'subgraph', subMemo);
      }
    };

    if (memo.skipSubgraphOf) {
      if (memo.skipSubgraphOf === dryad) {
        // may still be subgraph children to come
        delete memo.skipSubgraphOf;
      } else {
        let subgraph = makeSubgraph(dryad);
        if (subgraph) {
          return subgraph;
        }
      }
    } else {
      let subgraph = makeSubgraph(dryad);
      if (subgraph) {
        return subgraph;
      }
    }

    let dryadType = dryad.constructor.name;
    memo.seenTypes.push(dryadType);

    return new TreeNode(
      id,
      dryad,
      dryadType,
      dryad.children.map((child, i) => {
        return this._makeTree(child, id, i, memo);
      })
    );
  }
}

class TreeNode {
  id: string;
  dryad: Dryad;
  dryadType: string;
  children: Array<TreeNode>;

  constructor(id, dryad, dryadType, children) {
    this.id = id;
    this.dryad = dryad;
    this.dryadType = dryadType;
    this.children = children;
  }
}
