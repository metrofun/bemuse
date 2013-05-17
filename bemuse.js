/*jshint newcap:false */
/*global _ */
(function (root) {
    var MOD_NAME_SEPARATOR = '--',
        ELEMENT_NAME_SEPARATOR = '__',
        EMPTY_TAGS = _([
            'area', 'base', 'br',
            'col', 'hr', 'img',
            'input', 'link', 'meta', 'param'
        ]).reduce(function (obj, tag) {
            obj[tag] = true;
            return obj;
        }, {});

    /**
     * Classical prototype inheritance
     *
     * @param {Object} prototype
     *
     * @returns {Object}
     */
    // function inherit(prototype, properties) {
        // function F() {}

        // F.prototype = prototype;
        // return _.extend(new F(), properties);
    // }
    /**
     * Returns HTML class for modification
     *
     * @param {String} blockName
     * @param {String} mod
     */
    function canonicalModName(blockName, mod) {
        return [blockName, mod].join(MOD_NAME_SEPARATOR);
    }
    /**
     * Returns HTML class for block's element
     *
     * @param {String} blockName
     * @param {String} element
     */
    function canonicalElementName(blockName, element) {
        return [blockName, element].join(ELEMENT_NAME_SEPARATOR);
    }

    /**
     * DOM representation of block
     * @constructor
     *
     * @param {Object} [description]
     */
    function DOMBlock(node, blockName) {
        var modsClassNames = node.className.match(new RegExp(
            blockName + '(' + MOD_NAME_SEPARATOR + '\\S+)', 'g'
        ));

        this._blockClassNames = [blockName];
        if (modsClassNames) {
            this._blockClassNames = this._blockClassNames.concat(modsClassNames);
        }

        this._mergeBlockMods();
        this._attachBaseToMethods();

        // DOM instance must see declaration
        _(this).extend(Bemuse(blockName));

        this.node = node;
        this.init();
        this.setMod('inited');
    }
    DOMBlock.prototype = {
        /**
         * Merge all implementations of DOM into "this"
         * Last block modification overrides all
         */
        _mergeBlockMods: function () {
            _.map(this._blockClassNames, function (blockName) {
                var block = Bemuse(blockName);

                if (block && block.DOM) {
                    _(this).merge(block.DOM);
                }
            }, this);
        },
        /**
         * Add "base" method to own properties of DOM instance.
         * "Base" refers to previous implementation of method
         */
        _attachBaseToMethods: function () {
            _(this).forOwn(function (value, name) {
                if (_.isFunction(value)) {
                    value.base = this._callBaseMethod.bind(this, value, name);
                }
            }, this);
        },
        /**
         * Determines previous realization of method
         *
         * @param {Function} method
         * @param {String} methodName
         * @param {...Mixed} args Base method's arguments
         *
         * @returns {Function|Null}
         */
        _callBaseMethod: function (method, methodName) {
            // TODO memoize implementations
            var implementations = _(this._blockClassNames).map(function (blockName) {
                var block = Bemuse(blockName),
                    dom = block && block.DOM;

                return dom && dom[methodName];
            }, this).filter(Boolean).value(),
            i, args = [].slice.call(arguments, 2), baseMethod, customThis;

            for (i = 1; i <= implementations.length; i++) {
                if (implementations[i] === method) {
                    baseMethod = implementations[i - 1];
                    baseMethod.base = this._callBaseMethod.bind(
                        this,
                        baseMethod,
                        methodName
                    );
                    customThis = _.clone(this);
                    customThis[methodName] = baseMethod;
                    baseMethod.apply(customThis, args);
                    break;
                }
            }

        },
        addClass: function (selector) {
            if (!this.hasClass(selector)) {
                this.node.className += ' ' + selector;
            }
        },
        hasClass: function (selector) {
            return (" " + this.node.className + " ")
                .replace(/[\n\t\r]/g, " ").indexOf(" " + selector + " ") > -1;
        },
        getModClass: function (mod) {
            return canonicalModName(this.block, mod);
        },
        setMod: function (mod) {
            var block;
            if (!this.hasMod(mod)) {
                block = Bemuse(this.block, mod);
                if (block) {
                    _(this).merge(block);
                }
                if (this.onMod && this.onMod[mod]) {
                    this.onMod[mod].call(this, mod);
                }
                this.addClass(this.getModClass(mod));
            }
        },
        removeMod: function () {
        },
        hasMod: function (modName) {
            return this.hasClass(this.getModClass(modName));
        }
    };

    /**
     * Returns declaration of block
     *
     * @param {String} blockName
     * @param {String} [modName]
     *
     * @returns block declaration
     */
    function Bemuse(blockName, modName) {
        if (modName) {
            blockName = canonicalModName(blockName, modName);
        }
        return Bemuse._blocksByName[blockName];
    }
    root.Bemuse = Bemuse;
    _(Bemuse).extend({
        _blocksByName: {},
        /**
         * Declares new block
         *
         * @param {Object} declaration
         */
        declare: function (declaration) {
            var blockName = declaration.block,
                block, modName = declaration.mod;

            if (modName) {
                blockName = canonicalModName(blockName, modName);
            }

            block = this._blocksByName[blockName];
            if (!block) {
                block = this._blocksByName[blockName] = {};
            }

            _(block).merge(declaration);
        },
        DOM: {
            _domBlockById: {},
            /**
             * Initialize blocks, thats initOn load (by default)
             *
             * @param {Array} blocks block names to init
             * @param {Object} [context = document.body] dom node context, to reduce set
             */
            init: function (blockNames, context) {
                context = document.body || context;

                _(blockNames).map(function (blockName) {
                    var nodes;
                    if (Bemuse.DOM._isInitOnLoad(blockName)) {
                        nodes = context.querySelectorAll('.' + blockName);
                        _(nodes).map(function (node) {
                            this._getBlockOnNode(node, blockName);
                        }, this);
                    }
                }, this);
            },
            /**
             * Determines weather block should be initialized on load
             *
             * @param {String} blockName
             *
             * @returns {Boolean}
             */
            _isInitOnLoad: function (blockName) {
                var declaration = Bemuse(blockName),
                    DOM = declaration && declaration.DOM;

                return DOM && (!DOM.initOn || DOM.initOn === 'load');
            },
            /**
             * Returns DOM instance of block.
             * Creates DOM instance, if don't exist
             *
             * @param {Object} node
             * @param {String} blockName
             *
             * @returns {Object}
             */
            _getBlockOnNode: function (node, blockName) {
                var blockId = this._getBlockId(node, blockName);

                if (!this._domBlockById[blockId]) {
                    this._domBlockById[blockId] = new DOMBlock(node, blockName);
                }
                return this._domBlockById[blockId];
            },
            /**
             * Return unique DOM block identifier.
             * If it's not present, than generate and set
             *
             * @param {Object} node DOM element
             * @param {String} blockName
             *
             * @returns {String}
             */
            _getBlockId: function (node, blockName) {
                var paramsAttrName = 'data-' + blockName,
                    params = node.getAttribute(paramsAttrName);

                if (params) {
                    params = JSON.parse(params);
                } else {
                    params = {};
                }
                if (!params.blockId) {
                    params.blockId = _.uniqueId();
                    node.setAttribute(paramsAttrName, JSON.stringify(params));
                }
                return params.blockId;
            }
        },
        HTML: {
            /**
             * Converts BEM-oriented json into html,
             * using Block's descriptions
             *
             * @param {Object} bemjson
             * @param {Boolean} [manualInit = false]  Bemuse will add extra
             * script tag to initialize new blocks on insert. But you
             * can turn off it with manualInit = true
             *
             * @returns {String}
             */
            build: function (bemjson, manualInit) {
                var initOnInsert = {},
                    htmljson = this.bemjsonToHtmljson(bemjson, initOnInsert);

                if (!(manualInit || _(initOnInsert).isEmpty())) {
                    this._addInitScript(htmljson, initOnInsert);
                }
                return this.jsonToHtml(htmljson);
            },
            /**
             * Adds script tag into json,
             * to initialize blocks
             *
             * @param {Array|Object} json
             * @param {Array} [initOnInsert]
             */
            _addInitScript: function (json, initOnInsert) {
                var appendTo;
                if (_(json).isArray()) {
                    appendTo = json;
                } else if (_(json).isObject()) {
                    if (!json.content) {
                        json.content = [];
                    } else {
                        json.content = _([]).concat(json.content);
                    }
                    appendTo = json.content;
                }
                // append image that inits blocks on self load
                appendTo.push({tag: 'img', attrs: {
                    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCB1jYAAAAAIAAc/INeUAAAAASUVORK5CYII=',
                    onload: [
                        'Bemuse.DOM.init([',
                        _(initOnInsert).keys().map(function (blockName) {
                            return '\'' + blockName + '\'';
                        }),
                        '],this.parentNode)'
                    ].join('')
                }});
            },
            /**
             * Converts BEM-oriented json into HTML-oriented json
             *
             * @param {Mixed} bemjson
             * @param {Object} [root = bemjson] closest parent node
             * with "block" property
             * @param {Object} initOnInsert Empty object,
             * that will be filled with block names that
             * should be inited on insert
             *
             * @returns {Mixed}
             */
            bemjsonToHtmljson: function (bemjson, root, initOnInsert) {
                var args = [].slice.call(arguments),
                    block, mods, declarationNames, element;

                initOnInsert = args.pop();
                root = args[1] || bemjson;

                if (_(bemjson).isArray()) {
                    return _(bemjson).map(function (child, i) {
                        return bemjson[i] = this.bemjsonToHtmljson(
                            bemjson[i], root, initOnInsert
                        );
                    }, this);
                }

                if (bemjson.element) {
                    block = root.block || this.name;
                    mods = root.mods || this.mod || [];
                    element = bemjson.element;

                    declarationNames = _(mods).map(
                        _(canonicalModName).bind(null, block)
                    ).concat(block);

                    this._applyDeclarations(bemjson, declarationNames, element);
                    this._addClass(bemjson, canonicalElementName(block, element));
                } else if (bemjson.block) {
                    block = bemjson.block;
                    mods = bemjson.mods || [];

                    declarationNames = _(mods).map(
                        _.bind(canonicalModName, null, block)
                    ).concat(block);

                    _(declarationNames).some(function (name) {
                        if (Bemuse.DOM._isInitOnLoad(name)) {
                            return initOnInsert[block] = true;
                        }
                    }, this);

                    this._applyDeclarations(bemjson, declarationNames);
                    this._addClass(bemjson, declarationNames.join(' '));
                }
                if (bemjson.wrapper) {
                    if (_(bemjson.wrapper).isPlainObject()) {
                        bemjson.wrapper.content = bemjson;
                    }
                    bemjson = this.bemjsonToHtmljson(
                        bemjson.wrapper, root, initOnInsert
                    );
                } else if (bemjson.content) {
                    bemjson.content = this.bemjsonToHtmljson(
                        bemjson.content,
                        // closest parent with block property
                        bemjson.block ? bemjson:root,
                        initOnInsert
                    );
                }
                return bemjson;
            },
            /**
             * Apply Block's HTML declarations to bemjson.
             *
             * @param {Object} bemjson
             * @param {Array<String>} declarationNames canonical names of block with all mods
             * @param {String} [element] If ommited, process onBlock
             */
            _applyDeclarations: function (bemjson, declarationNames, element) {
                _(declarationNames).some(function (name) {
                    var declaration = Bemuse(name),
                        handler, htmlDeclaration;

                    // NOTE assignment
                    if ((htmlDeclaration = declaration && declaration.HTML)) {
                        handler = element
                            ? htmlDeclaration.onElement && htmlDeclaration.onElement[element]
                            : htmlDeclaration.onBlock;

                        if (handler) {
                            handler.call(declaration.HTML, bemjson);
                            // don't apply next declarations
                            return true;
                        }
                    }
                });
            },
            /**
             * Adds class
             *
             * @param {Object} htmljson HTML-oriented json
             * @param {String} className
             */
            _addClass: function (htmljson, className) {
                if (className) {
                    htmljson.attrs = htmljson.attrs || {};
                    if (htmljson.attrs['class']) {
                        htmljson.attrs['class'] += ' ';
                    } else {
                        htmljson.attrs['class'] = '';
                    }
                    htmljson.attrs['class'] += className;
                }
            },
            /**
             * Converts attrs object into html string
             *
             * @param {Object} attrs
             *
             * @returns {String}
             */
            attrsToHtml: function (attrs) {
                return _(attrs).reduce(function (memo, value, name) {
                    value = value.replace(/"/g, '&quot;');
                    return memo + [' ', name, '="', value, '"'].join('');
                }, '');
            },
            /**
             * Recursivly translates HTML-oriented json into HTML
             * @param {Mixed} htmljson
             *
             * @returns String
             */
            jsonToHtml: function (htmljson) {
                var tag, attrs, content, result;

                if (_(htmljson).isArray()) {
                    return _(htmljson).map(this.jsonToHtml, this).join('');
                // all logic goes here
                } else if (_(htmljson).isObject()) {
                    tag = htmljson.tag || 'div';
                    attrs = htmljson.attrs || {};

                    result = '<' +  tag + this.attrsToHtml(attrs);

                    if (EMPTY_TAGS[tag]) {
                        result += '/>';
                    } else {
                        content = this.jsonToHtml(htmljson.content);

                        result += '>' + content + '</' + tag + '>';
                    }
                    return result;
                } else {
                    return htmljson || '';
                }
            }
        }
    });
})(window);
