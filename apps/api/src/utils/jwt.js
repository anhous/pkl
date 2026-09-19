'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwtSecret, { expiresIn: env.jwtRefreshExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyToken };
