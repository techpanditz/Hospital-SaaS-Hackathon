const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// 🔒 Sandbox override email (ALL emails go here)
const SANDBOX_EMAIL = "seo.dhru1@gmail.com";

const sendEmail = async ({ to, subject, html }) => {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: SANDBOX_EMAIL, // ✅ force all emails to your inbox
    subject,
    html: `
      <div style="font-family: Arial, sans-serif">
        <div style="padding:10px;background:#f8fafc;border:1px solid #e5e7eb;margin-bottom:12px">
          <strong>Sandbox Mode:</strong> Originally intended for:
          <br />
          <strong>${to}</strong>
        </div>
        ${html}
      </div>
    `,
  });

  console.log("✅ Resend Sandbox Result:", result);

  if (result.error) {
    console.error("❌ Resend error:", result.error);
    throw new Error(result.error.message || "Email failed");
  }
};

module.exports = { sendEmail };


/*const nodemailer = require("nodemailer");

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
*/
/*
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true only for 465, we use 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Hospital CRM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Gmail email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Gmail send failed:", err.message);
    throw err; // IMPORTANT: this forces API to return error instead of lying
  }
};

module.exports = { sendEmail };
*/
/*
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to,
    subject,
    html,
  });

  console.log("✅ Resend result:", result);
};

module.exports = { sendEmail };
*/


