module.exports = {
  rc: false,
  add: 0,
  useYarn: false,
  whiteSpace: "  ",
  debug: false,
  outTransform: json => ({
    ...json,
    scripts: undefined,
    devDependencies: undefined,
  }),
};
