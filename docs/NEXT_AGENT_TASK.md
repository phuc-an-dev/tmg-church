# Milestone B — Invitation-only accounts

Status: authorized for local implementation and review; Resend/hosted rollout explicitly approved by the user.

## Scope

- Use Resend for the application invitation mail path and Supabase custom SMTP for Auth-generated mail.
- Add hashed, one-time invitation storage for existing `member_profile` emails.
- Add Master/Admin invitation create, resend, revoke, and status visibility through protected Server Actions/RPCs.
- Keep raw invitation tokens out of database rows, logs, URLs after acceptance, and Auth metadata.
- Prepare the password activation path and local verification; hosted Auth Hook/SMTP changes remain separate operator steps.

## Constraints

- Never commit `RESEND_API_KEY`, SMTP credentials, or service-role keys.
- Use environment variables and a verified sender such as `no-reply@auth.tmgchurch.website`.
- Do not enable public signup; keep the password login path available throughout activation rollout.
- No linked migration, hosted dashboard mutation, real invitation, push, or deploy in the coding slice without a separate explicit action.

## Acceptance

- Invitation rows are scoped to the Church and enforce normalized email, expiry, one-time use, resend revocation, and audit safety.
- Only Master/Admin can create, resend, or revoke an invitation for an existing member profile.
- Resend sends through Resend without exposing the raw token in logs or persistence.
- No-role, anonymous, cross-Church, replay, expired, email-mismatch, and concurrent-consumption cases are denied.
- Relevant tests, lint, typecheck, format check, build, and one independent review pass.
