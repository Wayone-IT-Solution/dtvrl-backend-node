import env from "#configs/env";
import nodemailer from "nodemailer";

// Create reusable transporter with connection pooling
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: env.SMTP_SECURE === "true",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      tls: {
        rejectUnauthorized: false,
      },
      pool: true, // Enable connection pooling
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 3, // Max 3 emails per second
    });
  }
  return transporter;
};

export const sendEmail = async (mailOptions) => {
  // Input validation
  if (!mailOptions?.to) {
    return {
      success: false,
      error: { message: "Recipient email is required" },
    };
  }
  if (!mailOptions?.subject) {
    return { success: false, error: { message: "Email subject is required" } };
  }
  if (!mailOptions?.text && !mailOptions?.html) {
    return { success: false, error: { message: "Email content is required" } };
  }

  const transporterInstance = getTransporter();

  try {
    const enhancedMailOptions = {
      ...mailOptions,
      from: mailOptions.from || `"DTVRL Team" <${env.SMTP_USER}>`,
      headers: {
        "X-Mailer": "DTVRL-NodeMailer",
        "X-Priority": "3",
        "Return-Path": env.SMTP_USER,
        "Reply-To": env.SMTP_USER,
        ...mailOptions.headers,
      },
    };

    const info = await transporterInstance.sendMail(enhancedMailOptions);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        command: error.command,
      },
    };
  }
};

// Graceful shutdown function
export const closeEmailTransporter = () => {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
};

// Auto-cleanup on process termination
process.on("SIGINT", closeEmailTransporter);
process.on("SIGTERM", closeEmailTransporter);
