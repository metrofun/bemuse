/*global ,equal, test, Bemuse */
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
    Bemuse.Block('test').declare({
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
        Bemuse.HTML.build({block: 'test'}),
        '<span class="test"><div class="test-2"></div></span>',
        'Block declaration works'
    );

    Bemuse.Block('test-2').declare({
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
        Bemuse.HTML.build({block: 'test-2', content: {element: 'title'}}),
        '<div class="test-2"><span class="test-2__title">Hello</span></div>',
        'Element declaration works'
    );

    Bemuse.Block('test-3').declare({
        HTML: {
            onBlock: function (tree) {
                tree.wrapper = {
                    block: 'test'
                };
            }
        }
    });
    equal(
        Bemuse.HTML.build({block: 'test-3'}),
        "<span class=\"test\"><div class=\"test-2\"></div></span>",
        'Wrapper works'
    );

    Bemuse.Block('test-4').declare({
        HTML: {
            onBlock: function (tree) {
                tree.wrapper = [];
            }
        }
    });
    equal(
        Bemuse.HTML.build({block: 'test-4'}),
        '',
        'Wrap with array to remove'
    );

    equal(
        Bemuse.HTML.build([
            {block: 'test'},
            {block: 'test-2'},
            {block: 'test-3'}
        ]),
        '<span class="test"><div class="test-2"></div></span><div class="test-2"></div><span class="test"><div class="test-2"></div></span>',
        'Arrays supported'
    );
});
module('Bemuse DOM');
test('DOM init', function () {
    equal(
        Bemuse.HTML.build([
            {block: 'test'},
            {block: 'test-2'},
            {block: 'test-3'}
        ]),
        '<span class="test"><div class="test-2"></div></span><div class="test-2"></div><span class="test"><div class="test-2"></div></span>',
        'Wrap with array to remove'
    );
});

