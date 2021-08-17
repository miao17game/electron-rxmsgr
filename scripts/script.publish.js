module.exports = {
  rc: false,
  add: 0,
  useYarn: false,
  whiteSpace: "  ",
  debug: false,
  registry: "https://registry.npmjs.org",
  outTransform: json => ({
    ...json,
    scripts: undefined,
    devDependencies: undefined,
  }),
};
