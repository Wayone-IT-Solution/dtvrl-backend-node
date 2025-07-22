import env from "#configs/env";
import nodemailer from "nodemailer";

export const sendEmail = async (mailOptions) => {
  const smtpConfig = {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === "true", // true for 465
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  };

  const transporter = nodemailer.createTransport(smtpConfig);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
