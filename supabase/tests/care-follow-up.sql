-- Local-only fixtures and assertions. Every schema/data change is rolled back.
\set ON_ERROR_STOP on
begin;
create temporary table care_assertions(label text);
grant all on care_assertions to authenticated;
create function pg_temp.care_assert(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_label; end if;
  insert into care_assertions values(p_label);
end $$;
create function pg_temp.care_expect(p_sql text, p_message text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_message or (p_message = 'permission' and sqlstate = '42501') then
      insert into care_assertions values(p_label); return;
    end if;
    raise exception 'FAIL: %, expected %, received % (%)', p_label, p_message, sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: %, expected rejection', p_label;
end $$;
-- Production uses one church. Relax only inside this rollback to exercise cross-church integrity.
drop index public.church_singleton_idx;
do $$
declare
  ch uuid := gen_random_uuid(); ch2 uuid := gen_random_uuid();
  mi uuid := gen_random_uuid(); mi2 uuid := gen_random_uuid();
  te uuid := gen_random_uuid(); te2 uuid := gen_random_uuid(); draft_te uuid := gen_random_uuid();
  g uuid := gen_random_uuid(); g2 uuid := gen_random_uuid(); other_g uuid := gen_random_uuid();
  commissioner uuid := gen_random_uuid(); leader uuid := gen_random_uuid(); leader2 uuid := gen_random_uuid();
  member uuid := gen_random_uuid(); outsider uuid := gen_random_uuid(); admin_member uuid := gen_random_uuid();
  cu uuid := gen_random_uuid(); lu uuid := gen_random_uuid(); l2u uuid := gen_random_uuid(); mu uuid := gen_random_uuid(); au uuid := gen_random_uuid();
  mm uuid := gen_random_uuid(); lm uuid := gen_random_uuid(); l2m uuid := gen_random_uuid(); cm uuid := gen_random_uuid();
  c uuid; legacy uuid := gen_random_uuid(); n uuid; s uuid; sp uuid; newest uuid;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; j jsonb;
begin
  -- Reusable fixture setup: isolated churches, active/draft terms, groups, users, memberships and absences.
  insert into public.church(id,name,slug) values(ch,'Care regression A','care-regression-a'),(ch2,'Care regression B','care-regression-b');
  insert into public.ministry(id,church_id,name,slug) values(mi,ch,'Care fixture','care-fixture'),(mi2,ch2,'Care fixture B','care-fixture-b');
  insert into public.ministry_term(id,ministry_id,name,slug) values(te,mi,'Care active','care-active'),(draft_te,mi,'Care draft','care-draft'),(te2,mi2,'Care other','care-other');
  update public.ministry_term set executive_board_roles=array['visitation_care_commissioner'] where id=te;
  update public.ministry_term set lifecycle = 'active' where id in (te,te2);
  insert into public.term_group(id,ministry_term_id,name,slug) values(g,te,'Care group A','care-group-a'),(g2,te,'Care group B','care-group-b'),(other_g,te2,'Care other group','care-other-group');
  insert into auth.users(id,aud,role,email) values(cu,'authenticated','authenticated','care-c@example.invalid'),(lu,'authenticated','authenticated','care-l@example.invalid'),(l2u,'authenticated','authenticated','care-l2@example.invalid'),(mu,'authenticated','authenticated','care-m@example.invalid'),(au,'authenticated','authenticated','care-a@example.invalid');
  insert into public.member_profile(id,church_id,full_name,user_id,slug) values(commissioner,ch,'Care Commissioner',cu,'care-commissioner'),(leader,ch,'Care Leader',lu,'care-leader'),(leader2,ch,'Care Leader B',l2u,'care-leader-b'),(member,ch,'Care Member',mu,'care-member'),(outsider,ch2,'Care Outsider',null,'care-outsider'),(admin_member,ch,'Care Admin',au,'care-admin');
  insert into public.ministry_membership(id,ministry_term_id,member_profile_id) values(mm,te,member),(lm,te,leader),(l2m,te,leader2),(cm,te,commissioner);
  insert into public.term_group_membership(term_group_id,ministry_membership_id,role,joined_at) values(g,mm,'member',now()-interval '100 days'),(g,lm,'group_leader',now()-interval '100 days'),(g2,l2m,'group_leader',now()-interval '100 days');
  insert into public.term_role_assignment(ministry_term_id,member_profile_id,role) values(te,commissioner,'visitation_care_commissioner');
  insert into public.system_role_assignment(church_id,user_id,role) values(ch,au,'admin');
  insert into public.care_flag(id,member_profile_id,ministry_term_id,flag_type) values(legacy,member,te,'legacy');
  alter table public.care_note disable trigger trg_care_note_append_only;
  insert into public.care_note(care_flag_id,note) values(legacy,'Legacy fixture private');
  alter table public.care_note enable trigger trg_care_note_append_only;
  for i in 1..3 loop
    s := gen_random_uuid(); sp := gen_random_uuid();
    insert into public.ministry_session(id,ministry_term_id,term_group_id,title,slug,session_date) values(s,te,g,'Care session','care-session-'||i,today-i);
    insert into public.session_participant(id,ministry_session_id,member_profile_id) values(sp,s,member);
    insert into public.attendance_record(session_participant_id,status) values(sp,'absent');
    if i=1 then newest:=sp; end if;
  end loop;
  -- Today's session and ministry-wide sessions must not affect the last three group sessions.
  insert into public.ministry_session(ministry_term_id,term_group_id,title,slug,session_date) values(te,g,'Care today','care-today',today),(te,g,'Care future','care-future',today+1),(te,null,'Care ministry','care-ministry',today-1);

  perform set_config('request.jwt.claim.sub',lu::text,true);
  execute 'set local role authenticated';
  perform pg_temp.care_assert(jsonb_array_length(public.get_my_care_scopes())=1,'leader scope');
  perform pg_temp.care_assert(jsonb_array_length(public.get_my_care_scopes()->0->'groups')=1,'leader own group only');
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=1,'three consecutive absents; today/future/ministry ignored');
  perform pg_temp.care_assert(not public.care_can_read_case(legacy),'leader cannot read group-null legacy');
  perform pg_temp.care_assert(jsonb_array_length(public.get_care_group_options(g)->'assignees')=1,'leader assigns only self');
  perform pg_temp.care_expect(format('select public.get_care_group_options(%L)',g2),'forbidden','leader cannot read other group options');
  perform pg_temp.care_expect(format('select public.create_care_follow_up(%L,%L,%L,null)',g,member,commissioner),'invalid','leader cannot assign commissioner');
  perform pg_temp.care_expect(format('insert into public.care_flag(member_profile_id,ministry_term_id,flag_type) values(%L,%L,''bypass'')',member,te),'permission','direct case insert denied');
  perform pg_temp.care_expect(format('select public.get_care_list(%L,null,''open'',1,null)',te2),'forbidden','other term denied');
  execute 'reset role';

  update public.attendance_record set status='excused' where session_participant_id=newest;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'excused breaks sequence');
  perform pg_temp.care_expect(format('select public.create_care_follow_up_from_absence(%L,%L,%L,null)',g,member,leader),'stale','stale confirmation denied');
  execute 'reset role';
  update public.attendance_record set status='present' where session_participant_id=newest;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'present breaks sequence');
  execute 'reset role';
  delete from public.attendance_record where session_participant_id=newest;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'missing record breaks sequence');
  execute 'reset role';
  insert into public.attendance_record(session_participant_id,status) values(newest,'absent');
  update public.term_group_membership set joined_at=now() where ministry_membership_id=mm;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'new member excludes pre-join sessions');
  execute 'reset role';
  update public.term_group_membership set joined_at=now()-interval '100 days',status='inactive' where ministry_membership_id=mm;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'inactive member excluded');
  perform pg_temp.care_expect(format('select public.create_care_follow_up(%L,%L,%L,null)',g,member,leader),'invalid','inactive manual create denied');
  execute 'reset role';
  update public.term_group_membership set status='transferred',ended_at=now() where ministry_membership_id=mm;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'transferred member excluded');
  execute 'reset role';
  update public.term_group_membership set status='active',ended_at=null where ministry_membership_id=mm;
  update public.member_profile set archived_at=now() where id=member;
  execute 'set local role authenticated';
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'archived member excluded');
  execute 'reset role';
  update public.member_profile set archived_at=null where id=member;
  execute 'set local role authenticated';
  c:= public.create_care_follow_up_from_absence(g,member,leader,today-1);
  perform pg_temp.care_expect(format('select public.add_care_note(%L,repeat(''x'',4001))',c),'invalid','note length over 4000 denied');
  perform pg_temp.care_expect(format('select public.add_care_note(%L,''   '')',c),'invalid','blank note denied');
  n:= public.add_care_note(c,'Private fixture note');
  j:=public.get_care_detail(c);
  perform pg_temp.care_assert(j->'case'->>'source'='attendance','attendance source');
  perform pg_temp.care_assert(jsonb_array_length(j->'case'->'sourceEvidence'->'sessions')=3,'server evidence snapshot');
  perform pg_temp.care_assert(j->>'canReadNotes'='true' and jsonb_array_length(j->'notes')=1,'assignee notes visible');
  perform pg_temp.care_assert(public.get_care_detail_by_slug(j->'case'->>'slug')->'case'->>'id'=c::text,'guarded slug detail');
  perform pg_temp.care_assert(not (public.get_care_list(te,g,'open',1,null)::text like '%Private fixture note%'),'list excludes notes');
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'open case suppresses suggestion');
  perform pg_temp.care_expect(format('select public.create_care_follow_up_from_absence(%L,%L,%L,null)',g,member,leader),'duplicate','duplicate attendance confirm rejected');
  perform pg_temp.care_expect(format('select public.create_care_follow_up(%L,%L,%L,null)',g,member,leader),'duplicate','duplicate manual create rejected');
  perform pg_temp.care_expect(format('update public.care_flag set status=''resolved'' where id=%L',c),'permission','direct case update denied');
  perform pg_temp.care_expect(format('delete from public.care_note where id=%L',n),'permission','direct note delete denied');
  perform pg_temp.care_expect(format('insert into public.care_note(care_flag_id,note,author_member_profile_id) values(%L,''Bypass'',%L)',c,leader),'permission','direct note insert denied');
  perform pg_temp.care_expect(format('update public.care_note set note=''Changed'' where id=%L',n),'permission','direct note update denied');
  execute 'reset role';
  perform pg_temp.care_expect(format('update public.care_flag set source_evidence=''{}'' where id=%L',c),'immutable','evidence immutable');
  perform pg_temp.care_expect(format('update public.care_flag set term_group_id=%L where id=%L',g2,c),'immutable','scope immutable');
  perform pg_temp.care_expect(format('update public.care_note set note=''Changed'' where id=%L',n),'immutable','note append only');
  perform pg_temp.care_expect(format('delete from public.care_note where id=%L',n),'immutable','owner note deletion denied');
  perform pg_temp.care_expect(format('delete from public.care_flag where id=%L',c),'immutable','case hard delete denied');
  perform pg_temp.care_expect(format('insert into public.care_flag(member_profile_id,ministry_term_id,term_group_id,flag_type) values(%L,%L,%L,''bad'')',member,te,other_g),'invalid','group term integrity');
  begin
    insert into public.care_flag(member_profile_id,ministry_term_id,flag_type) values(outsider,te,'bad');
    raise exception 'FAIL: cross-church insert allowed';
  exception when others then
    if sqlerrm <> 'Member profile and ministry term must belong to the same church' then raise; end if;
    perform pg_temp.care_assert(true,'member church integrity');
  end;

  perform set_config('request.jwt.claim.sub',cu::text,true);
  execute 'set local role authenticated';
  perform pg_temp.care_assert(jsonb_array_length(public.get_my_care_scopes()->0->'groups')=2,'commissioner all groups without workspace role');
  perform pg_temp.care_assert(jsonb_array_length(public.get_care_group_options(g)->'assignees')=2,'commissioner self and group leader options');
  perform pg_temp.care_assert(not public.care_can_coordinate(te2) and not public.care_can_manage_group(other_g),'commissioner term boundary');
  perform pg_temp.care_assert(public.get_care_detail(legacy)->'case'->>'source'='manual' and public.get_care_detail(legacy)->'case'->>'status'='open','legacy defaults preserved');
  perform pg_temp.care_assert(public.get_care_detail(legacy)->'notes'->0->>'authorName'='Unknown author','legacy author preserved');
  perform pg_temp.care_expect(format('select public.assign_care_follow_up(%L,%L)',c,leader2),'invalid','cross-group assignee rejected');
  perform public.assign_care_follow_up(c,commissioner);
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',lu::text,true);
  execute 'set local role authenticated';
  perform pg_temp.care_assert(public.care_can_read_case(c) and not public.care_can_read_notes(c),'old assignee metadata only');
  perform pg_temp.care_assert(jsonb_array_length(public.get_care_detail(c)->'notes')=0,'old assignee no note payload');
  perform pg_temp.care_assert((select count(*) from public.care_note where care_flag_id=c)=0,'direct notes RLS old assignee');
  perform pg_temp.care_expect(format('select public.add_care_note(%L,''No access'')',c),'forbidden','old assignee write denied');
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',au::text,true);
  execute 'set local role authenticated';
  perform pg_temp.care_assert(jsonb_array_length(public.get_my_care_scopes())=0,'admin no automatic Care scope');
  perform pg_temp.care_assert((select count(*) from public.care_note where care_flag_id=c)=0,'direct notes RLS admin');
  perform pg_temp.care_assert((select count(*) from public.care_flag where id=c)=0,'direct cases RLS admin');
  perform pg_temp.care_expect(format('select public.get_care_detail(%L)',c),'forbidden','admin detail denied');
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',mu::text,true);
  execute 'set local role authenticated';
  perform pg_temp.care_expect(format('select public.get_care_detail(%L)',c),'forbidden','ordinary member detail denied');
  perform pg_temp.care_assert((select count(*) from public.care_note where care_flag_id=c)=0,'ordinary member direct notes denied');
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',cu::text,true);
  execute 'set local role authenticated';
  perform public.assign_care_follow_up(c,leader);
  execute 'reset role';
  update public.term_group_membership set role='member' where ministry_membership_id=lm;
  perform set_config('request.jwt.claim.sub',lu::text,true);
  execute 'set local role authenticated';
  perform pg_temp.care_assert(not public.care_can_read_notes(c),'role revocation removes note rights');
  perform pg_temp.care_expect(format('select public.add_care_note(%L,''Revoked'')',c),'forbidden','revoked role note denied');
  execute 'reset role';
  update public.term_group_membership set role='group_leader' where ministry_membership_id=lm;
  update public.member_profile set archived_at=now() where id=leader;
  execute 'set local role authenticated';
  perform pg_temp.care_assert(not public.care_can_read_notes(c),'archived assignee loses note rights');
  execute 'reset role';
  update public.member_profile set archived_at=null where id=leader;
  perform set_config('request.jwt.claim.sub',cu::text,true);
  execute 'set local role authenticated';
  perform public.update_care_follow_up(c,'in_progress',today);
  perform public.update_care_follow_up(c,'resolved',null);
  perform pg_temp.care_assert(public.get_care_detail(c)->'case'->>'resolvedById'=commissioner::text,'resolve actor recorded');
  perform pg_temp.care_assert(public.get_care_detail(c)->'case'->>'resolvedAt' is not null,'resolve timestamp recorded');
  perform pg_temp.care_expect(format('select public.add_care_note(%L,''Resolved'')',c),'resolved','resolved notes denied');
  perform pg_temp.care_expect(format('select public.update_care_follow_up(%L,''open'',null)',c),'resolved','reopen denied');
  perform pg_temp.care_assert((public.get_care_absence_suggestions(te,g,1)->>'totalCount')::int=0,'resolve does not reuse previous absences');
  perform pg_temp.care_assert((public.get_care_list(te,g,'history',1,null)->>'totalCount')::int=1,'history contains resolved case');
  c:=public.create_care_follow_up(g,member,commissioner,null);
  execute 'reset role';
  perform pg_temp.care_assert((select bool_and(not payload::text like '%Private fixture%' and not payload ? 'note' and not payload ? 'sourceEvidence') from public.application_audit_log where target_id=c),'audit excludes note and evidence');
  update public.ministry_term set lifecycle='closed' where id=te;
  execute 'set local role authenticated';
  perform pg_temp.care_assert(public.get_care_detail(c)->>'readOnly'='true','closed detail read only');
  perform pg_temp.care_assert(public.get_care_detail(c)->>'canUpdate'='false','closed mutations hidden');
  perform pg_temp.care_assert(jsonb_array_length(public.get_my_care_scopes())=1,'closed scope retained');
  perform pg_temp.care_expect(format('select public.add_care_note(%L,''Closed'')',c),'closed','closed note denied');
  perform pg_temp.care_expect(format('select public.assign_care_follow_up(%L,%L)',c,leader),'closed','closed assign denied');
  perform pg_temp.care_expect(format('select public.update_care_follow_up(%L,''resolved'',null)',c),'closed','closed resolve denied');
  perform pg_temp.care_expect(format('select public.create_care_follow_up(%L,%L,%L,null)',g,member,commissioner),'closed','closed create denied');
  perform pg_temp.care_expect(format('select public.get_care_absence_suggestions(%L,%L,1)',te,g),'closed','closed suggestions denied');
  perform pg_temp.care_expect(format('select public.get_care_list(%L,null,''open'',1,null)',draft_te),'forbidden','draft Care denied');
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role authenticated';
  perform pg_temp.care_expect('select public.get_my_care_scopes()','forbidden','missing auth denied');
  execute 'reset role';
  perform pg_temp.care_assert(not has_function_privilege('anon','public.get_care_detail(uuid)','execute'),'anon RPC revoked');
  perform pg_temp.care_assert(not has_function_privilege('authenticated','public.care_absence_evidence(uuid,uuid)','execute'),'internal evidence RPC inaccessible');
  perform pg_temp.care_assert(not has_function_privilege('authenticated','public.care_case_json(uuid)','execute'),'internal case projection inaccessible');
  perform pg_temp.care_assert(not has_function_privilege('authenticated','public.care_write_audit(uuid,text)','execute'),'internal audit RPC inaccessible');
  perform pg_temp.care_assert(not has_function_privilege('anon','public.create_care_follow_up(uuid,uuid,uuid,date)','execute'),'anon create RPC revoked');
end $$;
select count(*) as passed_assertions from care_assertions;
rollback;
