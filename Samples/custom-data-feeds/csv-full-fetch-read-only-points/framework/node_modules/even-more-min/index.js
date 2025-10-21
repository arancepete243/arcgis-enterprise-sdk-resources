const mocha = require('mocha')
const inherits = require('util').inherits
const Base = mocha.reporters.Base

function EvenMoreMin(runner) {
  Base.call(this, runner)
  runner.once('end', this.epilogue.bind(this))
}

inherits(EvenMoreMin, Base)
exports = module.exports = EvenMoreMin
