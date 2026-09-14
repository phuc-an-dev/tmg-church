alter table public.member_segment
  add column accent_color text not null default '#3b82f6',
  add column icon_key text not null default 'layers-3';

alter table public.member_segment
  add constraint member_segment_accent_color_check
    check (accent_color ~ '^#[0-9a-f]{6}$'),
  add constraint member_segment_icon_key_check
    check (icon_key in (
      'layers-3', 'church', 'cross', 'users', 'user-round',
      'user-round-check', 'user-round-plus', 'handshake', 'heart',
      'sparkles', 'smile', 'party-popper', 'gamepad-2', 'dice-5',
      'briefcase-business', 'trending-up',
      'chart-no-axes-column-increasing', 'target', 'award', 'trophy',
      'lightbulb', 'book-open', 'graduation-cap', 'compass', 'globe-2',
      'flame', 'leaf', 'sun', 'moon', 'cloud', 'zap', 'music-2',
      'microphone-2', 'baby'
    ));
