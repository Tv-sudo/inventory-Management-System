const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { snapshot } = require('../monitoring/metricsStore');

router.get('/', auth, roles('admin'), (req, res) => {
  res.json(snapshot());
});

module.exports = router;
