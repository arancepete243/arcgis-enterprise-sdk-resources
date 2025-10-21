const routeJoiner = require('./route-joiner');

function composeRoutePath(params) {
  const { providerNamespace, path } = params;

  const finalPath =
    path.startsWith(providerNamespace) || path.startsWith(`/${providerNamespace}`)
      ? routeJoiner(path)
      : routeJoiner(providerNamespace, path);
  return new RegExp(finalPath, 'i');
}

module.exports = composeRoutePath;
