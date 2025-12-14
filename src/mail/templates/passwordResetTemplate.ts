const passwordResetTemplate = (resetLink: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
  <style>
    body {
      background-color: #ffffff;
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 1.4;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .message {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .body {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .cta {
      display: inline-block;
      padding: 12px 24px;
      background-color: #E85C0D;
      color: #FFFFFF;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      margin-top: 20px;
    }
    .cta:hover {
      background-color: #D04A0B;
    }
    .support {
      font-size: 14px;
      color: #BBBBBB;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="message">Password Reset Request</div>
    <div class="body">
      <p>Dear User,</p>
      <p>We received a request to reset your password. Click the button below to set a new password.</p>
      <a href="${resetLink}" class="cta">Reset Your Password</a>
      <p style="margin-top: 20px;">If you did not request this password reset, you can safely ignore this email.</p>
      <p>This link will expire in 5 minutes.</p>
    </div>
    <div class="support">
      If you need help, contact us at <a href="mailto:info@Pie.com">info@Pie.com</a>.
    </div>
  </div>
</body>
</html>`;
};

export default passwordResetTemplate;
