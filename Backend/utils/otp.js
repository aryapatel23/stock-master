// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate OTP expiration time
const getOTPExpiration = () => {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

// In production, integrate with email service (SendGrid, AWS SES, etc.)
const sendOTPEmail = async (email, otp) => {
  console.log(`[EMAIL] Sending OTP ${otp} to ${email}`);
  // TODO: Implement actual email sending
  return true;
};

// In production, integrate with SMS service (Twilio, AWS SNS, etc.)
const sendOTPSMS = async (phone, otp) => {
  console.log(`[SMS] Sending OTP ${otp} to ${phone}`);
  // TODO: Implement actual SMS sending
  return true;
};

module.exports = {
  generateOTP,
  getOTPExpiration,
  sendOTPEmail,
  sendOTPSMS
};
