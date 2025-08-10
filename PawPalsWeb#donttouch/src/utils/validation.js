const { body, param, query } = require('express-validator');

const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3 }).trim(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('phone').optional({ checkFalsy: true }).isMobilePhone(),
    body('role').optional().isIn(['dog_owner', 'garden_manager'])
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ]
};

const dogValidation = {
  create: [
    body('name').notEmpty().trim(),
    body('breed').notEmpty().trim(),
    body('age').isInt({ min: 0 }),
    body('gender').isIn(['male', 'female']),
    body('size').isIn(['small', 'medium', 'large']),
    body('weight').optional().isFloat({ min: 0 }),
    body('image').optional().isString(),
    body('gallery').optional().isArray(),
    body('personality.friendly').optional().isInt({ min: 1, max: 5 }),
    body('personality.energetic').optional().isInt({ min: 1, max: 5 }),
    body('personality.social').optional().isInt({ min: 1, max: 5 }),
    body('medicalInfo.vaccinated').optional().isBoolean()
  ],
  update: [
    param('id').isMongoId(),
    body('name').optional().trim(),
    body('breed').optional().trim(),
    body('age').optional().isInt({ min: 0 }),
    body('gender').optional().isIn(['male', 'female']),
    body('size').optional().isIn(['small', 'medium', 'large']),
    body('weight').optional().isFloat({ min: 0 }),
    body('image').optional().isString(),
    body('gallery').optional().isArray(),
    body('personality.friendly').optional().isInt({ min: 1, max: 5 }),
    body('personality.energetic').optional().isInt({ min: 1, max: 5 }),
    body('personality.social').optional().isInt({ min: 1, max: 5 }),
    body('medicalInfo.vaccinated').optional().isBoolean()
  ]
};

const gardenValidation = {
  create: [
    body('name').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('type').optional().isIn(['public', 'private']),
    body('location.address').notEmpty(),
    body('location.city').notEmpty(),
    body('location.coordinates.coordinates').isArray({ min: 2, max: 2 }),
    body('capacity.maxDogs').optional().isInt({ min: 1 })
  ],
  update: [
    param('id').isMongoId(),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('type').optional().isIn(['public', 'private']),
    body('capacity.maxDogs').optional().isInt({ min: 1 })
  ]
};

const visitValidation = {
  checkIn: [
    body('gardenId').isMongoId(),
    body('dogIds').isArray({ min: 1 }),
    body('dogIds.*').isMongoId(),
    body('notes').optional().trim()
  ],
  checkOut: [
    body('visitId').isMongoId()
  ]
};

const userValidation = {
  updateProfile: [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('phone').optional().isMobilePhone()
  ],
  changePassword: [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ]
};

module.exports = {
  authValidation,
  dogValidation,
  gardenValidation,
  visitValidation,
  userValidation
};
