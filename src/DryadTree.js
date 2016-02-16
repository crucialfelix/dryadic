import * as _  from 'underscore';


export default class DryadTree {

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
   * @param {Object} node - data object
   * @param {Function} fn - called with (dryad, context, node)
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

  collectCommands(methodName, node) {
    let dryad = this.dryads[node.id];
    let context = this.contexts[node.id];
    let commands = dryad[methodName](context);
    return {
      commands: commands,
      context: context,
      id: node.id,
      children: node.children.map((child) => this.collectCommands(methodName, child))
    };
  }

  updateContext(id, update) {
    this.contexts[id] = _.assign(this.contexts[id], update);
  }

  _createContext(dryad, dryadId, parentId) {
    let cc = {id: dryadId};
    if (parentId) {
      let parent = this.dryads[parentId];
      let childContext = parent.childContext(this.contexts[parentId]);
      return _.create(this.contexts[parentId], _.assign(childContext, cc));
    }
    return cc;
  }

  _makeTree(dryad, parentId, childIndex=0, memo={}) {
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
        // TODO: if its an array then wrap in Brethren
        if (_.isArray(subgraph)) {
          console.log('TODO: isArray', subgraph);
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

    // if (memo.skipSubgraphOf === dryad) {
    //   delete memo.skipSubgraphOf;
    // } else {
    //   let subgraph = dryad.subgraph();
    //   if (subgraph) {
    //     // can create context now and save reference to this subgraph tree
    //     // give subgraph a special parentId that shows it below myself
    //     // parentId = dryad.id + '%'
    //     memo.skipSubgraphOf = dryad;
    //     // if its an array then wrap in Brethren
    //     return this._makeTree(subgraph, parentId, childIndex, memo);
    //   }
    // }

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
