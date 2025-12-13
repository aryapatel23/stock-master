const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const OTP = require('../models/OTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, parseExpiration } = require('../utils/jwt');
const { generateOTP, getOTPExpiration, sendOTPEmail, sendOTPSMS } = require('../utils/otp');

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || null,
      role: role || 'user'
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + parseExpiration(process.env.JWT_REFRESH_EXPIRE || '7d'));
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: user.toPublicJSON(),
        token: accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deleted'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + parseExpiration(process.env.JWT_REFRESH_EXPIRE || '7d'));
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    const expiresIn = parseExpiration(process.env.JWT_EXPIRE || '15m');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toPublicJSON(),
        token: accessToken,
        refreshToken,
        expiresIn
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @route   POST /api/auth/logout
// @desc    Logout user (revoke refresh token)
// @access  Public
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Find and revoke token
    const token = await RefreshToken.findOne({ token: refreshToken });
    if (token) {
      token.isRevoked = true;
      await token.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
};

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Find token in database
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if revoked
    if (storedToken.isRevoked) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // Revoke old token
    storedToken.isRevoked = true;
    await storedToken.save();

    // Store new refresh token
    const expiresAt = new Date(Date.now() + parseExpiration(process.env.JWT_REFRESH_EXPIRE || '7d'));
    await RefreshToken.create({
      token: newRefreshToken,
      userId: decoded.userId,
      expiresAt
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: error.message
    });
  }
};

// @route   POST /api/auth/request-otp
// @desc    Request OTP for passwordless login
// @access  Public
const requestOTP = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number required'
      });
    }

    const identifier = email || phone;
    const type = email ? 'email' : 'phone';

    // Check if user exists
    const query = email ? { email } : { phone };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiration();

    // Delete old OTPs for this identifier
    await OTP.deleteMany({ identifier });

    // Store OTP
    await OTP.create({
      identifier,
      otp,
      type,
      purpose: 'login',
      expiresAt
    });

    // Send OTP
    if (type === 'email') {
      await sendOTPEmail(email, otp);
    } else {
      await sendOTPSMS(phone, otp);
    }

    res.json({
      success: true,
      otpSent: true,
      message: `OTP sent to ${type}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: error.message
    });
  }
};

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP required'
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number required'
      });
    }

    const identifier = email || phone;

    // Find OTP
    const otpRecord = await OTP.findOne({
      identifier,
      otp,
      verified: false
    });

    if (!otpRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check expiration
    if (otpRecord.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      return res.status(401).json({
        success: false,
        message: 'Too many attempts. Request new OTP'
      });
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Find user
    const query = email ? { email } : { phone };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + parseExpiration(process.env.JWT_REFRESH_EXPIRE || '7d'));
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  refresh,
  requestOTP,
  verifyOTP
};
