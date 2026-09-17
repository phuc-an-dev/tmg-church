import type { LucideIcon } from "lucide-react";
import {
  Award,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  Church,
  Cloud,
  Compass,
  Cross,
  Dice5,
  Flame,
  Gamepad2,
  Globe2,
  GraduationCap,
  Handshake,
  Heart,
  Layers3,
  Leaf,
  Lightbulb,
  Mic2,
  Moon,
  Music2,
  PartyPopper,
  Smile,
  Sparkles,
  Sun,
  Target,
  Trophy,
  TrendingUp,
  UserRound,
  UserRoundCheck,
  UserRoundPlus,
  Users,
  Zap,
} from "lucide-react";

export const DEFAULT_MINISTRY_COLOR = "#3b82f6";
export const DEFAULT_MINISTRY_ICON_KEY = "layers-3";

export const MINISTRY_COLOR_OPTIONS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Emerald", value: "#10b981" },
  { label: "Lime", value: "#84cc16" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Orange", value: "#f97316" },
  { label: "Red", value: "#ef4444" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Pink", value: "#ec4899" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Slate", value: "#64748b" },
] as const;

export const MINISTRY_ICON_COMPONENTS = {
  "layers-3": Layers3,
  church: Church,
  cross: Cross,
  users: Users,
  "user-round": UserRound,
  "user-round-check": UserRoundCheck,
  "user-round-plus": UserRoundPlus,
  handshake: Handshake,
  heart: Heart,
  sparkles: Sparkles,
  smile: Smile,
  "party-popper": PartyPopper,
  "gamepad-2": Gamepad2,
  "dice-5": Dice5,
  "briefcase-business": BriefcaseBusiness,
  "trending-up": TrendingUp,
  "chart-no-axes-column-increasing": ChartNoAxesColumnIncreasing,
  target: Target,
  award: Award,
  trophy: Trophy,
  lightbulb: Lightbulb,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  compass: Compass,
  "globe-2": Globe2,
  flame: Flame,
  leaf: Leaf,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  zap: Zap,
  "music-2": Music2,
  "microphone-2": Mic2,
  baby: Baby,
} as const satisfies Record<string, LucideIcon>;

export type MinistryIconKey = keyof typeof MINISTRY_ICON_COMPONENTS;
export const MINISTRY_ICON_KEYS = Object.keys(
  MINISTRY_ICON_COMPONENTS,
) as MinistryIconKey[];

const ministryIconOptionRows: Array<[MinistryIconKey, string, string]> = [
  ["layers-3", "Layers", "ministry structure"],
  ["church", "Church", "worship building"],
  ["cross", "Cross", "faith Jesus"],
  ["users", "People", "group community"],
  ["user-round", "Person", "member individual"],
  ["user-round-check", "Member check", "member approved"],
  ["user-round-plus", "Add member", "new person"],
  ["handshake", "Handshake", "care welcome"],
  ["heart", "Heart", "care love"],
  ["sparkles", "Sparkles", "creative celebration"],
  ["smile", "Smile", "joy children"],
  ["party-popper", "Celebration", "event party"],
  ["gamepad-2", "Games", "youth fun"],
  ["dice-5", "Dice", "games activity"],
  ["briefcase-business", "Business", "work professionals"],
  ["trending-up", "Growth", "growth progress"],
  ["chart-no-axes-column-increasing", "Chart", "metrics progress"],
  ["target", "Target", "mission focus"],
  ["award", "Award", "achievement honor"],
  ["trophy", "Trophy", "competition achievement"],
  ["lightbulb", "Lightbulb", "ideas learning"],
  ["book-open", "Open book", "Bible study reading"],
  ["graduation-cap", "Graduation", "education students"],
  ["compass", "Compass", "guidance direction"],
  ["globe-2", "Globe", "missions world"],
  ["flame", "Flame", "prayer passion"],
  ["leaf", "Leaf", "nature renewal"],
  ["sun", "Sun", "daylight summer"],
  ["moon", "Moon", "night evening"],
  ["cloud", "Cloud", "weather sky"],
  ["zap", "Lightning", "energy youth"],
  ["music-2", "Music", "worship song"],
  ["microphone-2", "Microphone", "speaking worship"],
  ["baby", "Baby", "nursery children"],
];

export const MINISTRY_ICON_OPTIONS: Array<{
  key: MinistryIconKey;
  label: string;
  keywords: string;
}> = ministryIconOptionRows.map(([key, label, keywords]) => ({
  key,
  label,
  keywords,
}));

export function isMinistryIconKey(value: string): value is MinistryIconKey {
  return value in MINISTRY_ICON_COMPONENTS;
}

export function ministryIconLabel(value: string) {
  const knownOption = MINISTRY_ICON_OPTIONS.find(
    (option) => option.key === value,
  );
  if (knownOption) return knownOption.label;

  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ministryIconFor(value: string): LucideIcon {
  return isMinistryIconKey(value)
    ? MINISTRY_ICON_COMPONENTS[value]
    : MINISTRY_ICON_COMPONENTS[DEFAULT_MINISTRY_ICON_KEY];
}

export function normalizeMinistryColor(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized)
    ? normalized
    : DEFAULT_MINISTRY_COLOR;
}
