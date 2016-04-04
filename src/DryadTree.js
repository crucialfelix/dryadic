import * as _  from 'underscore';


/**
 * Manages the tree structure, contexts for nodes,
 * utilities to walk the tree, collect commands and
 * call command middleware.
 */
export default class DryadTree {

  /**
   * @param {Dryad} rootDryad
   * @param {Function} getClass - lookup function
   */
  constructor(rootDryad, getClass) {
    this.root = rootDryad;
    this.dryads = {};
    this.contexts = {};
    this.getClass = getClass;
    this.tree = this._makeTree(this.root);
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
   * @param {Object} node - data object
   * @param {Object} memo - for usage during recursion
   */
  walk(fn, node, memo) {
    if (!node) {
      node = this.root;
    }
    memo = fn(node, this.dryads[node.id], this.contexts[node.id], memo);
    node.children.forEach((child) => {
      memo = this.walk(fn, child, memo);
    });
    return memo;
  }

  /**
   * Collect a tree of command objects from each node for a given method.
   * eg. 'add' 'remove' 'prepareForAdd'
   *
   * @param {String} methodName
   * @param {Dryad} node
   * @returns {Object}
   */
  collectCommands(methodName, node, player) {
    let dryad = this.dryads[node.id];
    let context = this.contexts[node.id];
    let commands = dryad[methodName](player);
    return {
      commands: commands,
      context: context,
      id: node.id,
      children: node.children.map((child) => this.collectCommands(methodName, child, player))
    };
  }

  /**
   * Construct a command tree for a single commandObject to be executed
   * with a single node's context.
   *
   * This is for runtime execution of commands,
   * called from streams and async processes initiated during Dryad's .add()
   */
  makeCommandTree(nodeId, command) {
    return {
      commands: command,
      context: this.contexts[nodeId],
      id: nodeId,
      children: []
    };
  }

  /**
   * Update the context for a node.
   *
   * @param {String} dryadId
   * @param {Object} update
   */
  updateContext(dryadId, update) {
    return this.contexts[dryadId] = _.assign(this.contexts[dryadId], update);
  }

  /**
   * Create and return initial context for a Dryad.
   *
   * Each context inherits from it's parent's context.
   *
   * @returns {Object}
   */
  _createContext(dryad, dryadId, parentId) {
    let cc = {id: dryadId};
    if (parentId) {
      let parent = this.dryads[parentId];
      let childContext = parent.childContext(this.contexts[parentId]);
      return _.create(this.contexts[parentId], _.assign(childContext, cc));
    }
    return cc;
  }

  /**
   * Given a Dryad (possibily with children), construct a tree of Objects
   * {id type children}
   *
   * Dryad classes may use requireParent() and subgraph() to replace themselves
   * with a different graph. So this tree is not a direct representation of the input
   * graph, but may be expanded through the use of requireParent() and subgraph()
   *
   * Generates ids for each Dryad
   * Stores each by its id
   * Creates context for each
   *
   * This method calls itself recursively for children.
   *
   * @param {Dryad} dryad
   * @param {String} parentId
   * @param {Integer} childIndex
   * @param {Object} memo - for internal usage during recursion
   * @returns {Object}
   */
  _makeTree(dryad, parentId, childIndex=0, memo={}) {
    if (!dryad.isDryad) {
      console.error('Not a dryad', dryad);
      throw new Error('Not a Dryad:' + dryad);
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
          let requiredParent = new (this.getClass(rq))({}, [dryad]);
          memo.skipRequireParentOf = dryad;
          return this._makeTree(requiredParent, parentId, childIndex, memo);
        }
      }
    }

    let id = parentId ? parentId + '.' + childIndex : '0';
    let context = this._createContext(dryad, id, parentId);
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
          throw new Error('Dryad subgraph should return a single Dryad with children.' + dr + subgraph);
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

    return {
      id: id,
      type: dryadType,
      // don't want Dryads from properties
      // they should be in subgraph
      // but there should be some comparable data dump of them
      // for diffing
      // properties: _convertObject(dryad.properties, dryad.id, 0, memo),
      // parent: this.contexts[parentId],
      children: this._convertObject(dryad.children, id, childIndex, memo)
    };
  }

  /**
   * private.
   *
   * Calls the appropriate method on the dryad.children
   * Currently it can only be an Array and all the children
   * must be a Dryad.
   *
   * It will be used for including the properties in the tree
   * for use in diffing. If there are any Dryad in the properties
   * then the Dryad class is currently responsible for returning those
   * in subgraph() so they get launched.
   *
   * @param {Dryad|Array|Object|String|Number|undefined} obj
   */
  _convertObject(obj, parentId, childIndex=0, memo={}) {
    if (obj.isDryad) {
      return this._makeTree(obj, parentId, childIndex, memo);
    }
    if (_.isArray(obj)) {
      return _.map(obj, (pp, ii) => {
        return this._convertObject(pp, parentId, ii, memo);
      });
    }
    if (_.isObject(obj)) {
      return _.mapObject(obj, (pp, key) => {
        return this._convertObject(pp, parentId, key, memo);
      });
    }
    // should check that its a primitive type
    return obj;
  }
}
