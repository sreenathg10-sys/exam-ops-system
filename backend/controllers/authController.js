// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const result = await query(
      `SELECT u.*,
        c.centre_code, c.centre_name, c.state, c.city,
        s.server_code, s.is_primary,
        z.zone_code, z.zone_name
       FROM users u
       LEFT JOIN centres c ON u.centre_id = c.id
       LEFT JOIN servers s ON u.server_id = s.id
       LEFT JOIN zones   z ON u.zone_id   = z.id
       WHERE u.username = $1 AND u.is_active = true`,
      [username.toUpperCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id:          user.id,
        username:    user.username,
        full_name:   user.full_name,
        role:        user.role,
        phone:       user.phone,
        is_primary:  user.is_primary || false,   // ← critical field
        centre_id:   user.centre_id,
        centre_code: user.centre_code,
        centre_name: user.centre_name,
        server_id:   user.server_id,
        server_code: user.server_code,
        zone_id:     user.zone_id,
        zone_code:   user.zone_code,
        zone_name:   user.zone_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.*,
        c.centre_code, c.centre_name,
        s.server_code, s.is_primary,
        z.zone_code, z.zone_name
       FROM users u
       LEFT JOIN centres c ON u.centre_id = c.id
       LEFT JOIN servers s ON u.server_id = s.id
       LEFT JOIN zones   z ON u.zone_id   = z.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const u = result.rows[0];
    res.json({
      success: true,
      user: {
        id:          u.id,
        username:    u.username,
        full_name:   u.full_name,
        role:        u.role,
        phone:       u.phone,
        is_primary:  u.is_primary || false,   // ← critical field
        centre_id:   u.centre_id,
        centre_code: u.centre_code,
        centre_name: u.centre_name,
        server_id:   u.server_id,
        server_code: u.server_code,
        zone_id:     u.zone_id,
        zone_code:   u.zone_code,
        zone_name:   u.zone_name,
      }
    });
  } catch (err) {
    next(err);
  }
};

const getTodaySchedule = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT ss.*, s.server_code, s.is_primary
       FROM session_schedule ss
       JOIN servers s ON ss.server_id = s.id
       WHERE ss.server_id = $1 AND ss.exam_date = $2
       LIMIT 1`,
      [req.user.server_id, today]
    );

    if (!result.rows[0]) {
      return res.json({ success: true, schedule: null, message: 'No exam scheduled today' });
    }

    res.json({ success: true, schedule: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, getTodaySchedule };
