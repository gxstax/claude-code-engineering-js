const assert = require("assert");
const { add } = require("./math");

const result = add(2, 3);
assert.strictEqual(result, 5, `Expected 5, got ${result}`);

console.log("All tests passed!");
