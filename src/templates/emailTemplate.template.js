export const generateOTPEmail = (emailDetails, user) => {
  const currentYear = new Date().getFullYear();
  const { otp, from } = emailDetails;

  return {
    from,
    to: user.email,
    subject: "Verify Your Email - OTP Code",
    text: `Hello ${user.name}, Your OTP verification code is: ${otp}. This code will expire in 10 minutes. Please do not share this code with anyone.`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
                <td align="center">
                    <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                    🔐 Email Verification
                                </h1>
                                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                                    Secure your account with OTP verification
                                </p>
                            </td>
                        </tr>

                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                    Hello ${user.name}! 👋
                                </h2>

                                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    We received a request to verify your email address. Please use the verification code below to complete the process.
                                </p>

                                <!-- OTP Box -->
                                <div style="text-align: center; margin: 40px 0;">
                                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);">
                                        <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                                            Your Verification Code
                                        </p>
                                        <div style="background-color: #ffffff; padding: 15px 25px; border-radius: 8px; margin: 10px 0;">
                                            <span style="font-size: 36px; font-weight: bold; color: #333333; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                ${otp}
                                            </span>
                                        </div>
                                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 12px; opacity: 0.9;">
                                            Valid for 10 minutes
                                        </p>
                                    </div>
                                </div>

                                <!-- Instructions -->
                                <div style="background-color: #f8f9ff; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 30px 0;">
                                    <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                        📋 How to use this code:
                                    </h3>
                                    <ul style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                        <li style="margin-bottom: 8px;">Copy the 6-digit code above</li>
                                        <li style="margin-bottom: 8px;">Return to the verification page</li>
                                        <li style="margin-bottom: 8px;">Enter the code in the verification field</li>
                                        <li>Click "Verify" to complete the process</li>
                                    </ul>
                                </div>

                                <!-- Security Notice -->
                                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border: 1px solid #ffeaa7; margin: 30px 0;">
                                    <div style="display: flex; align-items: center;">
                                        <span style="font-size: 20px; margin-right: 10px;">⚠️</span>
                                        <div>
                                            <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                                                Security Notice
                                            </h4>
                                            <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.5;">
                                                Never share this code with anyone. DTVRL team will never ask for your verification code.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                    If you didn't request this verification code, please ignore this email or contact our support team.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                <p style="color: #6c757d; font-size: 14px; margin: 0 0 15px 0;">
                                    Best regards,<br>
                                    <strong style="color: #495057;">DTVRL Team</strong>
                                </p>

                                <div style="margin: 20px 0;">
                                    <a href="https://dtvrl.com" style="color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">🌐 Website</a>
                                    <a href="mailto:support@dtvrl.com" style="color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">📧 Support</a>
                                    <a href="tel:+91-XXXXXXXXXX" style="color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">📞 Contact</a>
                                </div>

                                <p style="color: #adb5bd; font-size: 12px; margin: 20px 0 0 0; line-height: 1.5;">
                                    This is an automated message, please do not reply to this email.<br>
                                    © ${currentYear} DTVRL. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `,
  };
};
