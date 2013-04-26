/*global _ */
(function (root) {
    var blocks = {},
        MOD_NAME_SEPARATOR = '--',
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
     * Returns true for objects
     * Underscore's isObject returns true for functions and arrays.
     * @param {Mixed} arg
     *
     * @returns {Boolean}
     */
    function isObject(arg) {
        return Object.prototype.toString.call(arg) === '[object Object]';
    }
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
     * New block constructor
     * @param {String} name Block's name
     *
     * @return {Object}
     */
    function Block(name) {
        this.name = name;
    }
    Block.prototype = {
        /**
         * Declare new block,
         * if it already exists then extend it
         *
         * @param {Object} description
         * @param {Object} [description.DOM]
         * @param {Object} [description.HTML]
         */
        declare: function (description) {
            _(this).extend(description);
        },
        inherits: [],
        DOM: {
            initOn: 'load',
            destruct: function () {
            },
            onMod: {}
        },
        HTML: {
            onElement: {}
        }
    };

    root.Bemuse = {
        Block: function (blockName) {
            if (!blocks[blockName]) {
                blocks[blockName] = new Block(blockName);
            }
            return blocks[blockName];
        },
        DOM: {
            initOn: 'load'
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

                if (!manualInit) {
                    this._addInitScript(htmljson);
                }
                return this.jsonToHtml(htmljson);
            },
            /**
             * @param {Array|Object} json
             * @param {Array} [blocks]
             */
            _addInitScript: function (json) {
                if (_(json).isArray()) {
                    _(json).forEach(this._addInitScript);
                } else if (_(json).isObject()) {
                    if (!json.content) {
                        json.content = [];
                    }
                    // json.content = _(json.content).concat('zzzzz');
                }
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

                if (bemjson.block) {
                    block = bemjson.block;
                    mods = bemjson.mods || [];

                    declarationNames = mods.map(
                        canonicalModName.bind(null, block)
                    ).concat(block);

                    declarationNames.forEach(function (name) {
                        if (blocks[name] && blocks[name].DOM.initOn === 'load') {
                            initOnInsert[name] = true;
                        }
                    });

                    this._applyDeclarations(bemjson, declarationNames);
                    this._addClass(bemjson, declarationNames);
                } else if (bemjson.element) {
                    block = root.block || this.name;
                    mods = root.mods || this.mod || [];
                    element = bemjson.element;

                    declarationNames = mods.map(
                        canonicalModName.bind(null, block)
                    ).concat(block);

                    this._applyDeclarations(bemjson, declarationNames, element);
                    this._addClass(bemjson, canonicalElementName(block, element));
                }
                if (bemjson.wrapper) {
                    if (isObject(bemjson.wrapper)) {
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
                declarationNames.some(function (name) {
                    var declaration = blocks[name],
                        handler;

                    if (declaration) {
                        handler = element
                            ? declaration.HTML.onElement[element]
                            : declaration.HTML.onBlock;

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
             * @param {Mixed} bemjson
             *
             * @returns String
             */
            jsonToHtml: function (bemjson) {
                var tag, attrs, content, result;

                if (_(bemjson).isArray()) {
                    return bemjson.map(this.jsonToHtml.bind(this)).join('');
                // all logic goes here
                } else if (_(bemjson).isObject()) {
                    tag = bemjson.tag || 'div';
                    attrs = bemjson.attrs || {};

                    result = '<' +  tag + this.attrsToHtml(attrs);

                    if (EMPTY_TAGS[tag]) {
                        result += '/>';
                    } else {
                        content = this.jsonToHtml(bemjson.content);

                        result += '>' + content + '</' + tag + '>';
                    }
                    return result;
                } else {
                    return bemjson || '';
                }
            }
        }
    };
})(window);
