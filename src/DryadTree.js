/* @flow */
import * as _ from 'underscore';
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
  dryads: {[id:string]: Dryad};
  contexts: {[id:string]: Object};
  getClass: Function;
  rootContext: Object;
  nodeLookUp: Map<string,TreeNode>;

  /**
   * @param {Dryad} rootDryad
   * @param {Function} getClass - lookup function
   */
  constructor(rootDryad:?Dryad, getClass:Function, rootContext:Object={}) {
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
      this.walk((node:TreeNode) => this.nodeLookUp.set(node.id, node));
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
  walk(fn:Function, node:?TreeNode, memo:Object={}) : Object {
    if (!node) {
      node = this.tree;
    }

    if (node) {
      memo = fn(node, this.dryads[node.id], this.contexts[node.id], memo);
      node.children.forEach((child:TreeNode) => {
        memo = this.walk(fn, child, memo);
      });
    }

    return memo;
  }

  /**
   * Collect a tree of command objects from each node for a given method.
   * eg. 'add' 'remove' 'prepareForAdd'
   *
   * @param {String} methodName
   * @param {TreeNode} node - default is the root
   * @returns {CommandNode}
   */
  collectCommands(methodName:string, node:TreeNode, player:DryadPlayer) : CommandNode {

    let dryad = this.dryads[node.id];
    let context = this.contexts[node.id];

    let commands:?Object;
    try {
      switch (methodName) {
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
          throw new Error(`Unsupported command ${methodName}`);
      }

    } catch(error) {
      player.log.log(`Error during collectCommands "${methodName}" for node:\n`);
      player.log.log(node);
      throw error;
    }

    return new CommandNode(
      commands,
      context,
      dryad.properties,
      node.id,
      node.children.map(child => this.collectCommands(methodName, child, player))
    );
  }

  /**
   * Construct a command tree for a single commandObject to be executed
   * with a single node's context.
   *
   * This is for runtime execution of commands,
   * called from streams and async processes initiated during Dryad's .add()
   */
  makeCommandTree(nodeId:string, commands:Object) : Object {
    return new CommandNode(
      commands,
      this.contexts[nodeId],
      this.dryads[nodeId].properties,
      nodeId,
      []
    );
  }

  /**
   * Update a Dryad's context.
   *
   * @param {String} dryadId
   * @param {Object} update - values to assign into context
   * @returns {Object} context
   */
  updateContext(dryadId:string, update:Object) : Object {
    return _.assign(this.contexts[dryadId], update);
  }

  /**
   * Get a representation of current state of the tree.
   * Contains add|remove|prepared and may hold errors.
   */
  getDebugState() : Object {
    const formatState = (s) => {
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

      if (s.prepared) {
        return 'prepared';
      }
    };

    const dbug = (node) => {
      let r = {
        class: this.dryads[node.id].constructor.name,
        // props: this.dryads[node.id].properties,
        state: formatState(this.contexts[node.id].state)
      };
      if (node.children.length) {
        r = _.assign(r, {children: node.children.map(dbug)});
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
   * Create and return initial context for a Dryad.
   *
   * Each context has the parent's context as its prototype,
   * so parent values are visible to children.
   *
   * @returns {Object}
   */
  _createContext(dryad:Dryad, dryadId:string, parentId:?string, rootContext:Object={}) : Object {
    let cc = _.assign({id: dryadId}, rootContext, dryad.initialContext());
    if (parentId) {
      let parent = this.dryads[parentId];
      // In the case of a Properties at the top level, there is no existing parent although there was a parentId of '0'
      // passed in.
      let parentContext = this.contexts[parentId];
      if (parentContext) {
        let childContext = parent.childContext(parentContext);
        return _.create(parentContext, _.assign(childContext, cc));
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
  _makeTree(dryad:Dryad, parentId:?string, childIndex:number|string=0, memo:Object={}) : TreeNode {
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
        if (!_.contains(memo.seenTypes, rq)) {
          // fetch the parent class from dryadTypes registery by name
          if (!this.getClass) {
            throw new Error('A getClass lookup was not provided to DryadTree and ' + dryad.constructor.name + ' needs one for requireParent()');
          }
          let requiredParent:Dryad = new (this.getClass(rq))({}, [dryad]);
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
      // This makes the context
      let propertiesNode = this._makeTree(propertiesDryad, id, 'props', memo);
      // The property accessors need this function to lookup the child dryad and get its .value()
      this.contexts[propertiesNode.id].getChildValue = (cindex) => {
        let node = this.nodeLookUp.get(propertiesNode.id);
        if (node) {
          let childNode = node.children[cindex];
          // get the dryad and context
          return childNode.dryad.value(this.contexts[childNode.id]);
        } else {
          throw new Error(`Dryad TreeNode not registered in nodeLookUp: ${id}`);
        }
      };

      return propertiesNode;
    }

    let context = this._createContext(dryad, id, parentId, this.rootContext);
    this.dryads[id] = dryad;
    this.contexts[id] = context;

    let makeSubgraph = (dr) => {
      let subgraph = dr.subgraph();
      if (subgraph) {
        context.subgraph = {};
        let subMemo = _.clone(memo);
        // When and if this dryad appears in its own subgraph
        // then do not call subgraph() on that. It will just
        // do prepare/add/remove on its own self.
        subMemo.skipSubgraphOf = dryad;
        // objects in subgraph will store references to themselves
        // in this dryad's context because of this memo flag:
        subMemo.subgraphOfId = id;
        // if its an array then should have been supplied in a Branch
        if (Array.isArray(subgraph)) {
          throw new Error('Dryad subgraph should return a single Dryad with children. ${dr} ${subgraph}');
        }

        return this._makeTree(subgraph, id, 'subgraph', subMemo);
      }
    };

    if (memo.skipSubgraphOf) {
      if (memo.skipSubgraphOf === dryad) {
        // may still be subgraph children to come
        delete memo.skipSubgraphOf;
      } else {
        // This dryad is in a subgraph of another
        // store self and context in that parent's context
        // under the dryad.tag or create a unique id
        if (memo.subgraphOfId) {
          this.contexts[memo.subgraphOfId].subgraph[dryad.tag || id] = {
            dryad: dryad,
            context: context
          };
        }

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
        return this._makeTree(child, id, i, memo)
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
