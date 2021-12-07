module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  'extends': [
    'eslint:recommended'
  ],
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 11
  }
}
