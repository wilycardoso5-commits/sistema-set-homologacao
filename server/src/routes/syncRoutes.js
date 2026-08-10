const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

router.get('/sync', syncController.getSyncData);
router.post('/sync', syncController.postSyncData);

module.exports = router;
