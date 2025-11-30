const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // ✅ REQUIRED for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // ✅ MUST be Gmail App Password
  },
  tls: {
    rejectUnauthorized: false, // ✅ prevents Render TLS handshake issues
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Hospital CRM" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
