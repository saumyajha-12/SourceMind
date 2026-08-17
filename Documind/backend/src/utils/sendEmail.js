const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendVerificationEmail = async (to, otp) => {
  console.log(`Sending verification email to ${to} with OTP: ${otp}`);

  const { data, error } = await resend.emails.send({
    from: "DocuMind <no-reply@documindai.dev>",
    to,
    subject: "Verify your DocuMind account",
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    `,
  });

  console.log("Resend response data:", data);
  console.log("Resend response error:", error);

  if (error) {
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  return data;
};


exports.sendResetPasswordEmail = async (to, otp) => {
  const { data, error } = await resend.emails.send({
    from: "DocuMind <no-reply@documindai.dev>",
    to,
    subject: "Reset your DocuMind password",
    html: `
      <h2>Reset Password</h2>
      <p>Your password reset OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    `,
  });

  console.log("Reset email response:", data);
  console.log("Reset email error:", error);

  if (error) {
    throw new Error(`Reset email failed: ${JSON.stringify(error)}`);
  }

  return data;
};