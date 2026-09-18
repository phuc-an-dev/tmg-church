import { execFileSync } from "node:child_process";

const projectRoot = process.cwd();
const localSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const databaseContainer = "supabase_db_tmg-church";

function assertLocalSupabaseUrl() {
  const hostname = new URL(localSupabaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error(
      "Phase 1 authorization fixtures require a localhost Supabase URL.",
    );
  }
}

function run(command: string, args: string[], input?: string) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function runLocalFixtureSql(sql: string) {
  const containers = run("docker", ["ps", "--format", "{{.Names}}"]);
  if (!containers.split("\n").includes(databaseContainer)) {
    throw new Error("The local Supabase database container is not running.");
  }

  run(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    sql,
  );
}

export default function setupPhaseOneDatabase() {
  assertLocalSupabaseUrl();
  run("pnpm", [
    "dlx",
    "supabase@latest",
    "db",
    "reset",
    "--version",
    "20260914000004",
    "--no-seed",
  ]);

  runLocalFixtureSql(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', 'a841f275-afc9-46cf-9b23-a6268ab2fb4b', 'authenticated', 'authenticated', 'anphucphamtrinh@gmail.com', crypt('TMGPhase1FixturePassword!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"a841f275-afc9-46cf-9b23-a6268ab2fb4b","email":"anphucphamtrinh@gmail.com","email_verified":true,"phone_verified":false}'::jsonb, now(), now()),
      ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000099', 'authenticated', 'authenticated', 'phase1-admin@example.test', crypt('TMGPhase1FixturePassword!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"00000000-0000-4000-8000-000000000099","email":"phase1-admin@example.test","email_verified":true,"phone_verified":false}'::jsonb, now(), now());

    update auth.users
    set confirmation_token = '', recovery_token = '', email_change_token_new = '',
      email_change = '', email_change_token_current = '',
      phone_change = '', phone_change_token = '', reauthentication_token = '';

    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values
      ('anphucphamtrinh@gmail.com', 'a841f275-afc9-46cf-9b23-a6268ab2fb4b', '{"sub":"a841f275-afc9-46cf-9b23-a6268ab2fb4b","email":"anphucphamtrinh@gmail.com"}'::jsonb, 'email', now(), now()),
      ('phase1-admin@example.test', '00000000-0000-4000-8000-000000000099', '{"sub":"00000000-0000-4000-8000-000000000099","email":"phase1-admin@example.test"}'::jsonb, 'email', now(), now());

    insert into public.church (id, name, slug)
    values ('c0000000-0000-4000-8000-000000000001', 'Chi Hội TMG', 'hoi-thanh-tmg');

    insert into public.member_profile (id, church_id, full_name, user_id)
    values ('e1a52f99-6f89-425a-aaca-676369dd6991', 'c0000000-0000-4000-8000-000000000001', 'Phạm Trịnh Ân Phúc', 'a841f275-afc9-46cf-9b23-a6268ab2fb4b');

    insert into public.leaders (user_id, email)
    values ('a841f275-afc9-46cf-9b23-a6268ab2fb4b', 'anphucphamtrinh@gmail.com');

    insert into public.ministry (id, church_id, name, slug)
    values ('1b7fb214-e255-4007-80d6-ebd1cece1a30', 'c0000000-0000-4000-8000-000000000001', 'Ban Điều Hành', 'ban-dieu-hanh');

    insert into public.ministry_term (id, ministry_id, name, slug)
    values ('51de3dbb-929f-473a-ac34-014f33c79938', '1b7fb214-e255-4007-80d6-ebd1cece1a30', 'Nhiệm kỳ 2025-2026', 'nhiem-ky-2025-2026');

    insert into public.term_department (id, ministry_term_id, name, slug)
    values
      ('29d6fdc3-a173-40d4-a8cc-e848e791ed58', '51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Âm Nhạc', 'ban-am-nhac'),
      ('2545c56e-58c1-404c-b0da-9ddd87a95896', '51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Tương Trợ', 'ban-tuong-tro'),
      ('72fbf959-7160-490a-b9fc-b0536b48fdba', '51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Thăm Viếng', 'ban-tham-vieng'),
      ('9df2b680-c721-412c-8fbd-10f08265a6b4', '51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Kỹ Thuật', 'ban-ky-thuat'),
      ('39fbe079-ffea-4484-aea1-805fefff179d', '51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Trang Trí', 'ban-trang-tri');

    insert into public.ministry_membership (ministry_term_id, member_profile_id)
    values ('51de3dbb-929f-473a-ac34-014f33c79938', 'e1a52f99-6f89-425a-aaca-676369dd6991');
  `);

  run("pnpm", ["dlx", "supabase@latest", "migration", "up"]);
}
