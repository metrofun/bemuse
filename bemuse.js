/*global _ */
(function (root) {
    var blocks = {},
        MOD_NAME_SEPARATOR = '--',
        ELEMENT_NAME_SEPARATOR = '__',
        EMPTY_TAGS = _.reduce([
            'area', 'base', 'br',
            'col', 'hr', 'img',
            'input', 'link', 'meta', 'param'
        ], function (obj, tag) {
            obj[tag] = true;
            return obj;
        }, {});

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

    function Block(name) {
        this.name = name;

        if (!blocks[this.name]) {
            blocks[this.name] = {};
        }
    }
    Block.prototype = {
        declare: function (description) {
            if (blocks[this.name]) {
                _.extend(blocks[this.name], description);
            } else {
                blocks[this.name] = new Block(description);
            }
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
            return new Block({name: blockName});
        },
        HTML: {
            /**
             * Converts BEM-oriented json into html,
             * using Block's descriptions
             *
             * @param {Object} bemjson
             * @param {Object} [parent = bemjson] required for recursion
             * @param {Object} [root = bemjson]  closest parent node with "block" property
             *
             * @returns {String}
             */
            build: function (bemjson, parent, root) {
                return this.jsonToHtml(this.bemjsonToHtmljson(
                    bemjson,
                    parent,
                    root
                ));
            },
            /**
             * Converts BEM-oriented json into HTML-oriented json
             *
             * @param {Mixed} bemjson
             * @param {Object} [parent = bemjson] required for recursion
             * @param {Object} [root = bemjson]  closest parent node with "block" property
             *
             * @returns {Mixed}
             */
            bemjsonToHtmljson: function (bemjson, parent, root) {
                parent = parent || bemjson;
                root = root || bemjson;

                var block = root.block || this.name,
                    mods = (block && (root.mods || this.mod)) || [],
                    declNames,
                    element;

                if (bemjson.element || bemjson.block) {
                    // build array of all declaration names
                    // to check against current bemjson
                    if (mods.length) {
                        declNames = mods.map(canonicalModName.bind(null, block));
                    } else {
                        declNames  = [];
                    }
                    declNames.push(block);

                    if (bemjson.element) {
                        // process element
                        element = bemjson.element;
                        this._applyDeclarations(bemjson, declNames, element);
                        this._addClass(bemjson, canonicalElementName(element));
                    } else {
                        // process block
                        this._applyDeclarations(bemjson, declNames);
                        this._addClass(bemjson, block);
                        this._addClass(bemjson, mods.map(
                            canonicalModName.bind(null, block)
                        ).join(' '));
                    }
                }
                if (bemjson.wrapper) {
                    if (_.isObject(bemjson.wrapper)) {
                        bemjson.wrapper.content = bemjson;
                    }
                    return (parent.content = this.bemjsonToHtmljson(
                        bemjson.wrapper,
                        parent,
                        root
                    ));
                } else if (bemjson.content) {
                    return this.bemjsonToHtmljson(
                        bemjson.content,
                        bemjson,
                        // closest parent with block property
                        bemjson.block ? bemjson:root
                    );
                } else {
                    return bemjson;
                }
            },
            /**
             * Apply Block's HTML declarations to bemjson.
             *
             * @param {Object} bemjson
             * @param {Array<String>} declNames canonical names of block with all mods
             * @param {String} [element] If ommited, process onBlock
             */
            _applyDeclarations: function (bemjson, declNames, element) {
                declNames.some(function (name) {
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
                htmljson.attrs = htmljson.attrs || {};
                if (htmljson.attrs['class']) {
                    htmljson.attrs['class'] += ' ';
                } else {
                    htmljson.attrs['class'] = '';
                }
                htmljson.attrs['class'] += className;
            },
            /**
             * Converts attrs object into html string
             *
             * @param {Object} attrs
             *
             * @returns {String}
             */
            attrsToHtml: function (attrs) {
                return _.reduce(attrs, function (memo, value, name) {
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

                if (_.isArray(bemjson)) {
                    return bemjson.map(this.jsonToHtml.bind(this)).join('');
                // all logic goes here
                } else if (_.isObject(bemjson)) {
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
