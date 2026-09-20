import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env["RESEND_API_KEY"] || "";
  return new Resend(apiKey);
}

function getDefaultFrom() {
  return process.env["RESEND_FROM_EMAIL"] || "RCH PlumbFlow <onboarding@resend.dev>";
}

export const resend = {
  get emails() {
    return getResendClient().emails;
  },
};

export interface SendResetEmailParams {
  to: string;
  ownerName?: string;
  resetCode: string;
  resetLink?: string;
}

export interface SendWelcomeEmailParams {
  to: string;
  ownerName: string;
  businessName: string;
}

export interface SendVerificationEmailParams {
  to: string;
  ownerName: string;
  businessName?: string;
  verificationCode: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  isSandboxRestriction?: boolean;
  sandboxRecipient?: string;
}

/**
 * Send an authentic password reset email via Resend with brand styling and security code.
 */
export async function sendPasswordResetEmail(params: SendResetEmailParams): Promise<EmailResult> {
  const { to, ownerName = "there", resetCode, resetLink } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your RCH PlumbFlow password</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0b0d0e; padding: 24px 32px; text-align: left;">
      <span style="color: #f59e0b; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">RCH PlumbFlow</span>
      <span style="color: #94a3b8; font-size: 13px; margin-left: 8px;">Field Management</span>
    </div>
    
    <div style="padding: 32px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Reset Your Password</h1>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 20px 0;">
        Hello ${ownerName},
      </p>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0;">
        We received a request to reset the password for your RCH PlumbFlow account. Use the 6-digit verification code below to complete your reset:
      </p>
      
      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 18px 24px; text-align: center; margin: 0 0 24px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Your Security Reset Code</div>
        <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b;">${resetCode}</div>
        <div style="font-size: 12px; color: #b45309; margin-top: 6px;">Valid for 15 minutes</div>
      </div>
      
      ${
        resetLink
          ? `
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetLink}" style="display: inline-block; background-color: #f59e0b; color: #0b0d0e; font-size: 16px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
          Click Here to Reset Password
        </a>
      </div>`
          : ""
      }
      
      <p style="font-size: 13px; line-height: 20px; color: #64748b; margin: 0 0 16px 0;">
        If you did not request a password reset, you can safely ignore this email. Your existing password will remain secure and unchanged.
      </p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      
      <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 18px;">
        RCH PlumbFlow &bull; Northampton, NN1 &bull; Support: 01632 960019<br />
        Built for trade professionals who work on-site.
      </p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: getDefaultFrom(),
      to,
      subject: "Reset your RCH PlumbFlow password",
      html,
      text: `Hello ${ownerName},\n\nYour RCH PlumbFlow password reset code is: ${resetCode}\n\nThis code is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.`,
    });

    if (error) {
      console.error("[Resend] Failed to send password reset email:", error);
      const isSandbox =
        Boolean(error.message?.toLowerCase().includes("only send testing emails")) ||
        (error as { statusCode?: number }).statusCode === 403;
      return { success: false, error: error.message, isSandboxRestriction: isSandbox };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Resend] Exception sending password reset email:", msg);
    const isSandbox = msg.toLowerCase().includes("only send testing emails");
    return { success: false, error: msg, isSandboxRestriction: isSandbox };
  }
}

/**
 * Send a welcome onboarding email to newly registered business owners.
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<EmailResult> {
  const { to, ownerName, businessName } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to RCH PlumbFlow</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f7f8; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #0b0d0e; padding: 24px 32px;">
      <span style="color: #f59e0b; font-size: 20px; font-weight: 800;">RCH PlumbFlow</span>
    </div>
    <div style="padding: 32px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Welcome, ${ownerName}!</h1>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
        Your 14-day free trial for <strong>${businessName}</strong> is now active.
      </p>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0;">
        Everything you need to quote, complete jobs, and get paid faster is ready in your account.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://rchplumbflow.co.uk/app" style="display: inline-block; background-color: #f59e0b; color: #0b0d0e; font-size: 16px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
          Open PlumbFlow App
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: getDefaultFrom(),
      to,
      subject: `Welcome to RCH PlumbFlow, ${ownerName}!`,
      html,
      text: `Welcome to RCH PlumbFlow, ${ownerName}!\n\nYour 14-day trial for ${businessName} is ready.`,
    });

    if (error) {
      console.error("[Resend] Welcome email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Send a 6-digit signup email verification code via Resend.
 */
export async function sendSignupVerificationEmail(
  params: SendVerificationEmailParams,
): Promise<EmailResult> {
  const { to, ownerName, businessName = "your business", verificationCode } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your email - RCH PlumbFlow</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0b0d0e; padding: 24px 32px; text-align: left;">
      <span style="color: #f59e0b; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">RCH PlumbFlow</span>
      <span style="color: #94a3b8; font-size: 13px; margin-left: 8px;">Account Verification</span>
    </div>
    
    <div style="padding: 32px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Verify Your Email Address</h1>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
        Hello <strong>${ownerName}</strong>,
      </p>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0;">
        Thank you for starting your free trial of RCH PlumbFlow for <strong>${businessName}</strong>. Please enter the 6-digit confirmation code below to verify your email address and activate your workspace:
      </p>
      
      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; text-align: center; margin: 0 0 24px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Verification Code</div>
        <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e293b;">${verificationCode}</div>
        <div style="font-size: 12px; color: #b45309; margin-top: 8px;">Valid for 15 minutes</div>
      </div>
      
      <p style="font-size: 14px; line-height: 22px; color: #64748b; margin: 0 0 8px 0;">
        If you didn't attempt to sign up for RCH PlumbFlow, please ignore this email.
      </p>
    </div>
    
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      &copy; 2026 RCH PlumbFlow. Built for UK Plumbing & Heating Specialists.
    </div>
  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: getDefaultFrom(),
      to,
      subject: `${verificationCode} is your PlumbFlow verification code`,
      html,
      text: `Hello ${ownerName},\n\nYour PlumbFlow 6-digit verification code is: ${verificationCode}\n\nEnter this code to complete your signup for ${businessName}. Valid for 15 minutes.`,
    });

    if (error) {
      console.error("[Resend] Verification email error:", error);
      const isSandbox =
        Boolean(error.message?.toLowerCase().includes("only send testing emails")) ||
        (error as { statusCode?: number }).statusCode === 403;
      return {
        success: false,
        error: error.message,
        isSandboxRestriction: isSandbox,
        sandboxRecipient: "raysystem@dieselhead.in",
      };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isSandbox = msg.toLowerCase().includes("only send testing emails");
    return {
      success: false,
      error: msg,
      isSandboxRestriction: isSandbox,
      sandboxRecipient: "raysystem@dieselhead.in",
    };
  }
}
