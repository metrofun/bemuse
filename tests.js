/*global ,equal, test, Bemuse, asyncTest, start */
module('Bemuse HTML');
test('HTML jsonToHtml', function () {
    equal(
        Bemuse.HTML.jsonToHtml({
            tag: 'img'
        }),
        '<img/>',
        'empty tags works'
    );

    equal(
        Bemuse.HTML.jsonToHtml({
            tag: 'span'
        }),
        '<span></span>',
        'non-empty tags works'
    );

    equal(
        Bemuse.HTML.jsonToHtml({
            tag: 'img',
            attrs: {
                src: ''
            }
        }),
        '<img src=""/>',
        'attrs works'
    );

    equal(
        Bemuse.HTML.jsonToHtml({
            tag: 'div',
            content: [
                'click',
                {tag: 'a', content: 'here'}
            ]
        }),
        '<div>click<a>here</a></div>',
        'nesting works'
    );
});
test('HTML build', function () {
    Bemuse.declare({
        block: 'test',
        HTML: {
            onBlock: function (tree) {
                tree.tag = 'span';
                tree.content = {
                    block: 'test-2'
                };
            }
        }
    });
    equal(
        Bemuse.HTML.build({block: 'test'}, true),
        '<span class="test"><div class="test-2"></div></span>',
        'Block declaration works'
    );

    Bemuse.declare({
        block: 'test-2',
        HTML: {
            onElement: {
                title: function (tree) {
                    tree.tag = 'span';
                    tree.content = 'Hello';
                }
            }
        }
    });
    equal(
        Bemuse.HTML.build({block: 'test-2', content: {element: 'title'}}, true),
        '<div class="test-2"><span class="test-2__title">Hello</span></div>',
        'Element declaration works'
    );

    Bemuse.declare({
        block: 'test-3',
        HTML: {
            onBlock: function (tree) {
                tree.wrapper = {
                    block: 'test'
                };
            }
        }
    });
    equal(
        Bemuse.HTML.build({block: 'test-3'}, true),
        "<span class=\"test\"><div class=\"test-2\"></div></span>",
        'Wrapper works'
    );

    Bemuse.declare({
        block: 'test-4',
        HTML: {
            onBlock: function (tree) {
                tree.wrapper = [];
            }
        }
    });
    equal(
        Bemuse.HTML.build({block: 'test-4'}, true),
        '',
        'Wrap with array to remove'
    );

    equal(
        Bemuse.HTML.build([
            {block: 'test'},
            {block: 'test-2'},
            {block: 'test-3'}
        ], true),
        '<span class="test"><div class="test-2"></div></span><div class="test-2"></div><span class="test"><div class="test-2"></div></span>',
        'Arrays supported'
    );
});
module('Bemuse DOM');
asyncTest('DOM base', 2, function () {
    var html, elem, counter = 0;

    Bemuse.declare({
        block: 'test',
        DOM: {
            init: function () {
                counter++;
                equal(counter, 3, 'all three init methods were called');

                start();
            }
        }
    });

    Bemuse.declare({
        block: 'test',
        mod: 'hz',
        DOM: {
            init: function () {
                counter++;
                this.init.base();
            }
        }
    });

    Bemuse.declare({
        block: 'test',
        mod: 'user',
        DOM: {
            init: function () {
                counter++;
                equal(counter, 1, 'last mod called first');

                this.init.base();
            }
        }
    });


    html = Bemuse.HTML.build([
        {
            block: 'test',
            mods: ['hz', 'user']
        },
        {block: 'test-2'},
        {block: 'test-3'}
    ]);

    elem = document.createElement("div");
    elem.innerHTML = html;
    console.log(html);
    document.body.insertBefore(elem, document.body.childNodes[0]);
});

