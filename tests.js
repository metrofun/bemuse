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
    console.log(Bemuse.HTML.build({
        block: 'test'
    }));
    equal('', '', '');
});
