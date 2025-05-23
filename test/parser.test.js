const assert = require('assert');
const { __TEST_ONLY_parsePlaceholders, newPlaceholderRegex } = require('../lib/compile-prompt');

console.log('Running parser.test.js...');

function testParser() {
    console.log('  Running testParser tests...');

    const testCases = [
        {
            name: "Simple file path",
            template: "Hello {{/some/file.md}} world!",
            expected: {
                "{{/some/file.md}}": { raw: "{{/some/file.md}}", type: "file", key: "/some/file.md", filters: [], default: null }
            }
        },
        {
            name: "Simple variable",
            template: "Data: {{$repomix}}",
            expected: {
                "{{$repomix}}": { raw: "{{$repomix}}", type: "repomix", key: "repomix", filters: [], default: null }
            }
        },
        {
            name: "Variable with one filter",
            template: "{{$type:filterA}}",
            expected: {
                "{{$type:filterA}}": { raw: "{{$type:filterA}}", type: "type", key: "type", filters: [{ name: "filterA", arg: null }], default: null }
            }
        },
        {
            name: "Variable with multiple filters, one with arg",
            template: "{{$type:filterA:filterB(argValue)}}",
            expected: {
                "{{$type:filterA:filterB(argValue)}}": { 
                    raw: "{{$type:filterA:filterB(argValue)}}", 
                    type: "type", 
                    key: "type", 
                    filters: [{ name: "filterA", arg: null }, { name: "filterB", arg: "argValue" }], 
                    default: null 
                }
            }
        },
        {
            name: "Variable with default value",
            template: "{{$type|default=foo}}",
            expected: {
                "{{$type|default=foo}}": { raw: "{{$type|default=foo}}", type: "type", key: "type", filters: [], default: "foo" }
            }
        },
        {
            name: "Variable with filter and default value",
            template: "{{$type:filterA(argVal)|default=bar}}",
            expected: {
                "{{$type:filterA(argVal)|default=bar}}": { 
                    raw: "{{$type:filterA(argVal)|default=bar}}", 
                    type: "type", 
                    key: "type", 
                    filters: [{ name: "filterA", arg: "argVal" }], 
                    default: "bar" 
                }
            }
        },
        {
            name: "File path with default value",
            template: "{{/file/path.json|default=/other/path.json}}",
            expected: {
                "{{/file/path.json|default=/other/path.json}}": { 
                    raw: "{{/file/path.json|default=/other/path.json}}", 
                    type: "file", 
                    key: "/file/path.json", 
                    filters: [], 
                    default: "/other/path.json" 
                }
            }
        },
        {
            name: "Multiple placeholders",
            template: "File: {{/file.txt}} and Var: {{$data:transform|default=empty}}",
            expected: {
                "{{/file.txt}}": { raw: "{{/file.txt}}", type: "file", key: "/file.txt", filters: [], default: null },
                "{{$data:transform|default=empty}}": { 
                    raw: "{{$data:transform|default=empty}}", 
                    type: "data", 
                    key: "data", 
                    filters: [{ name: "transform", arg: null }], 
                    default: "empty" 
                }
            }
        },
        {
            name: "Filter argument with spaces (if supported - current regex allows it)",
            template: "{{$type:filterB(arg with spaces)}}",
            expected: {
                "{{$type:filterB(arg with spaces)}}": { 
                    raw: "{{$type:filterB(arg with spaces)}}", 
                    type: "type", 
                    key: "type", 
                    filters: [{ name: "filterB", arg: "arg with spaces" }], 
                    default: null 
                }
            }
        },
        {
            name: "Filter argument with single quotes",
            template: "{{$type:filterC('quoted arg')}}",
            expected: {
                 "{{$type:filterC('quoted arg')}}": {
                    raw: "{{$type:filterC('quoted arg')}}",
                    type: "type",
                    key: "type",
                    filters: [{ name: "filterC", arg: "'quoted arg'" }], // Current regex keeps quotes in arg
                    default: null
                }
            }
        },
        {
            name: "Filter argument with double quotes",
            template: '{{$type:filterD("double quoted arg")}}',
            expected: {
                 '{{$type:filterD("double quoted arg")}}': {
                    raw: '{{$type:filterD("double quoted arg")}}',
                    type: "type",
                    key: "type",
                    filters: [{ name: "filterD", arg: '"double quoted arg"' }], // Current regex keeps quotes
                    default: null
                }
            }
        },
        {
            name: "No placeholders",
            template: "Just static text.",
            expected: {}
        },
        {
            name: "Escaped curly brace in file path",
            template: "{{/file/path\\}with\\}braces.md}}",
            expected: {
                "{{/file/path\\}with\\}braces.md}}": { raw: "{{/file/path\\}with\\}braces.md}}", type: "file", key: "/file/path}with}braces.md", filters: [], default: null }
            }
        }
    ];

    testCases.forEach(tc => {
        const actual = __TEST_ONLY_parsePlaceholders(tc.template);
        assert.deepStrictEqual(actual, tc.expected, `Test Case '${tc.name}' Failed`);
    });

    console.log('  testParser tests passed.');
}


// Regex direct test (optional, as parsePlaceholders covers it)
function testRegexDirectly() {
    console.log('  Running testRegexDirectly (optional)...');
    const match = newPlaceholderRegex.exec("{{$type:filterA(arg1)|default=val}}");
    newPlaceholderRegex.lastIndex = 0; // Reset regex

    assert.ok(match, "Regex Test Case 1: Basic match failed");
    // match[0] is raw: {{$type:filterA(arg1)|default=val}}
    // match[1] is filePath: undefined
    // match[2] is varTypeOrKey: type
    // match[3] is filtersString: :filterA(arg1)
    // match[4] is defaultValue: val
    assert.strictEqual(match[2], "type", "Regex Test Case 1: Type mismatch");
    assert.strictEqual(match[3], ":filterA(arg1)", "Regex Test Case 1: FiltersString mismatch");
    assert.strictEqual(match[4], "val", "Regex Test Case 1: Default value mismatch");
    
    console.log('  testRegexDirectly passed.');
}

if (require.main === module) {
    testParser();
    testRegexDirectly(); // Optionally run direct regex tests
    console.log('All parser tests passed!');
}

module.exports = { testParser, testRegexDirectly };
