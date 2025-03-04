const { validationResult } = require('express-validator');
const { createError } = require('../utils/error.utils');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(400, 'Validation Error', errors.array()));
  }
  next();
};

module.exports = {
  validate,
};
