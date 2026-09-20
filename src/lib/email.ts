import { createServerFn } from "@tanstack/react-start";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSignupVerificationEmail,
  type SendResetEmailParams,
  type SendWelcomeEmailParams,
  type SendVerificationEmailParams,
  type EmailResult,
} from "@/server/email";

/**
 * Server function to securely trigger a password reset email via Resend.
 */
export const requestPasswordResetEmail = createServerFn({ method: "POST" })
  .validator((data: SendResetEmailParams) => data)
  .handler(async ({ data }): Promise<EmailResult> => {
    return await sendPasswordResetEmail(data);
  });

/**
 * Server function to trigger an email verification OTP code via Resend on new signups.
 */
export const requestSignupVerificationEmail = createServerFn({ method: "POST" })
  .validator((data: SendVerificationEmailParams) => data)
  .handler(async ({ data }): Promise<EmailResult> => {
    return await sendSignupVerificationEmail(data);
  });

/**
 * Server function to trigger a welcome email via Resend on new signups.
 */
export const triggerWelcomeEmail = createServerFn({ method: "POST" })
  .validator((data: SendWelcomeEmailParams) => data)
  .handler(async ({ data }): Promise<EmailResult> => {
    return await sendWelcomeEmail(data);
  });
