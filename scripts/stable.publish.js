const run = require("@bigmogician/publisher");
const config = require("./script.publish");

run.default({
  ...config,
});
