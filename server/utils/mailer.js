import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendPasswordResetEmail(email, resetUrl) {
  await transporter.sendMail({
    from: `"SiteCraft AI" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Reset your SiteCraft AI password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Reset your password</h2>

        <p>
          We received a request to reset the password for your SiteCraft AI account.
        </p>

        <p>
          Click the button below to create a new password.
        </p>

        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 22px;
            background: #ff5a1f;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 16px 0;
          "
        >
          Reset Password
        </a>

        <p>
          This link will expire in 2 minutes.
        </p>

        <p>
          If you did not request this password reset, you can safely ignore this email.
        </p>

        <p>SiteCraft AI</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email, code) {
  await transporter.sendMail({
    from: `"SiteCraft AI" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Verify your SiteCraft AI email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Verify your email address</h2>

        <p>
          Thanks for creating your SiteCraft AI account.
        </p>

        <p>
          Enter the verification code below to verify your email address:
        </p>

        <div
          style="
            margin: 24px 0;
            padding: 18px;
            background: #f7f7f8;
            border-radius: 12px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
          "
        >
          ${code}
        </div>

        <p>
        This code will expire in 2 minutes.
        </p>

        <p>
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendContactEmail({ name, email, message }) {
  await transporter.sendMail({
    from: `"SiteCraft AI Contact" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_USER,
    replyTo: email,
    subject: `New Contact Message from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 24px;">
        
        <h2 style="margin-bottom: 8px;">
          New Contact Message
        </h2>

        <p style="color: #666; margin-bottom: 24px;">
          Someone submitted the contact form on SiteCraft AI.
        </p>

        <div style="
          background: #f7f7f8;
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 12px;
        ">
          <strong>Name</strong>
          <p style="margin: 6px 0 0;">
            ${name}
          </p>
        </div>

        <div style="
          background: #f7f7f8;
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 12px;
        ">
          <strong>Email</strong>
          <p style="margin: 6px 0 0;">
            ${email}
          </p>
        </div>

        <div style="
          background: #f7f7f8;
          padding: 16px;
          border-radius: 10px;
        ">
          <strong>Message</strong>
          <p style="margin: 6px 0 0; white-space: pre-line;">
            ${message}
          </p>
        </div>

        <p style="
          margin-top: 24px;
          font-size: 12px;
          color: #999;
        ">
          This is an automatically generated message from the
          SiteCraft AI contact form. Please do not reply to this
          automated notification.
        </p>

      </div>
    `,
  });
}
