# Supabase Auth Custom SMTP Setup

Use this guide to switch Campus Marketplace from Supabase's built-in email provider (2 emails/hour) to your own SMTP server for Auth emails.

This affects:
- signup confirmation emails
- password reset emails
- email-change confirmation emails

The existing app auth code already calls Supabase Auth correctly. You do not need to change auth service code for this setup.

## 1. Prerequisites

1. You have a Supabase project connected for this repo.
2. You have SMTP credentials from your provider or SMTP server:
   - host
   - port
   - username
   - password
   - sender/from email (example: no-reply@auth.your-domain.com)
   - sender name (example: Campus Marketplace)
3. Your sender domain has DNS records configured:
   - SPF
   - DKIM
   - DMARC

Without SPF/DKIM/DMARC, delivery and inbox placement will be unreliable.

## 2. Configure SMTP in Supabase Dashboard

1. Open Supabase Dashboard for your project.
2. Go to Authentication -> Email -> SMTP Settings.
3. Enable custom SMTP.
4. Fill in:
   - SMTP Host
   - SMTP Port
   - SMTP User
   - SMTP Pass
   - Sender email (From)
   - Sender name
5. Save.

After this, Supabase Auth sends email through your SMTP provider, not the built-in provider.

## 3. Configure Auth Rate Limits

After switching to custom SMTP, Supabase still applies Auth rate limits. Default limits may still be too low for production.

1. Go to Authentication -> Rate Limits.
2. Increase Email Sends limit (`rate_limit_email_sent`) to your expected throughput.
3. Keep per-user cooldown limits (`signup`, `recover`, `otp`) to reduce abuse.

Recommendation:
- start with a moderate value (for example 60-300 per hour)
- monitor logs and provider reputation before raising further

## 4. Verify End-to-End

Run the app and test both flows:

1. Signup flow
   - Use the signup UI.
   - Confirm the verification email arrives at a non-team address.
2. Forgot-password flow
   - Use the reset email page.
   - Confirm reset email arrives and link works.

Then inspect Supabase Auth logs and provider logs:
- no SMTP auth failures
- no `rate limit exceeded` on email endpoints
- no sender-domain authentication errors

## 5. Security and Deliverability Checklist

- Use a dedicated auth sender (not marketing sender).
- Keep Auth templates minimal and transactional.
- Turn on CAPTCHA for signup if abuse starts.
- Rotate SMTP password if leaked.
- Keep a backup SMTP provider ready for incident response.
