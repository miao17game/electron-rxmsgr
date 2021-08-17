const run = require("@bigmogician/publisher");
const config = require("./script.publish");

run.default({
  ...config,
  rc: "alpha",
  useStamp: true,
  debug: false,
});
