module.exports = function transformCoordinates(coordinates, params, transformFunction) {
  if (Array.isArray(coordinates[0])) {
    return coordinates.map((el) => {
      return transformCoordinates(el, params, transformFunction);
    });
  }

  return transformFunction(coordinates, params);
};
