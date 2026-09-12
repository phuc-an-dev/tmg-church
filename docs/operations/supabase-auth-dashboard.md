# Supabase Auth Dashboard Configuration

This document specifies the exact authentication settings required in the hosted Supabase project dashboard (Authentication > URL Configuration and Authentication > Email Templates).

> [!IMPORTANT]
> **Operator Note**: Do not apply these settings directly to the hosted Supabase project as part of automated runs or current local development tasks. These instructions are for manual configuration by an authorized operations administrator during staging or production provisioning.

---

## 1. URL Configuration

In the Supabase Dashboard, navigate to **Authentication** -> **URL Configuration**:

### Site URL

```text
https://tmgchurch.website
```

### Redirect URLs

Add each of the following authorized callback URLs to the **Redirect URLs** list:

- **Production callback**:
  ```text
  https://tmgchurch.website/admin/auth/callback
  ```
- **Local development callback**:
  ```text
  http://localhost:3000/admin/auth/callback
  ```

> [!WARNING]
> Do not use wildcards (`*`) or unvalidated preview deployment domains in the redirect list without an explicit secure redirect validation policy.

---

## 2. Email Provider Settings

In the Supabase Dashboard, navigate to **Authentication** -> **Providers** -> **Email**:

- **Enable Email provider**: `ON`
- **Confirm email**: `OFF` (or managed per policy)
- **Secure password change**: `OFF` (Password flows are not used in this project)
- **Mailer OTP expiration**: `3600` seconds (1 hour)

---

## 3. Magic Link Email Template

In the Supabase Dashboard, navigate to **Authentication** -> **Email Templates** -> **Magic Link**:

### Subject

```text
Đăng nhập vào Hệ thống Quản trị Hội Thánh TMG
```

### Body (HTML)

The template must use `{{ .ConfirmationURL }}` exactly as the target for the sign-in action. Do not expose tokens directly (do not use `{{ .Token }}`), do not introduce password reset flows, and do not hardcode environment-specific callback URLs.

Copy the exact contents of `supabase/templates/magic_link.html`. That file is the canonical local and hosted Magic Link body; do not maintain a second copy in this runbook.

---

## 4. Verification Check

After applying in the hosted dashboard:

1. Trigger a Magic Link sign-in from `/admin/login` on production or staging.
2. Confirm that the delivered email has the subject `Đăng nhập vào Hệ thống Quản trị Hội Thánh TMG`.
3. Confirm that clicking the button directs to `https://tmgchurch.website/admin/auth/callback?code=...&next=/admin`.
4. Confirm successful PKCE session exchange and redirect to `/admin`.
