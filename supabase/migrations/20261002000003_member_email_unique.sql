-- Enforce one portal identity per email: the invitation flow resolves the
-- auth account by lower(trim(member_profile.email)), so duplicate or
-- case-duplicated emails must be impossible.
create unique index member_profile_email_unique_key
  on public.member_profile (lower(trim(email)))
  where email is not null and email <> '';
