/**
 * Asset Path Constants
 * 
 * This file provides type-safe references to all image assets in the application.
 * Generated from public/assets-registry.json
 * 
 * Usage:
 *   import { ASSET_PATHS } from '@/lib/asset-paths';
 *   
 *   <img src={ASSET_PATHS.icons.student} alt="Student" />
 * 
 * Last Updated: 2026-05-11
 * Total Assets: 33
 */

export const ASSET_PATHS = {
  icons: {
    generic: "/images/icon-generic.svg",
    generic2: "/images/icon-generic2.svg",
    student: "/images/icon-student.svg",
    parent: "/images/icon-parent.svg",
    dashboard: "/images/icon-dashboard.svg",
    chevronDown: "/images/icon-chevron-down.svg",
    chevronDown2: "/images/icon-chevron-down2.svg",
    chevronDown3: "/images/icon-chevron-down3.svg",
    chevronDown4: "/images/icon-chevron-down4.svg",
    caretDown: "/images/icon-caret-down.svg",
    group: "/images/icon-group.svg",
    plus: "/images/icon-plus.svg",
    search: "/images/icon-search.svg",
    settings: "/images/icon-settings.svg",
    sort: "/images/icon-sort.svg",
    divider: "/images/icon-divider.svg",
    more: "/images/icon-more.svg",
    logout: "/images/logout-icon.svg",
  },

  illustrations: {
    avatarsPeople: "/images/admin-profile.png",
    avatarsPeopleFresh: "/images/avatars-people-fresh.png",
    chatgpt: "/images/chatgpt-photoroom.png",
    chatgptFresh: "/images/chatgpt-fresh.png",
    container: "/images/icon-notification-bell.svg",
    ellipse2735: "/images/parent-female-dark-hair.png",
    ellipse2735Fresh: "/images/parent-female-dark-hair-fresh.png",
    lightbulbFresh: "/images/lightbulb-fresh.png",
    maskGroup: "/images/mask-group.svg",
    image1: "/images/parent-female-light-hair.png",
    vector: "/images/vector.svg",
  },

  avatars: {
    student1: "/images/avatars/student-1.png",
    student2: "/images/avatars/student-2.png",
    student3: "/images/avatars/student-3.png",
    student4: "/images/avatars/student-4.png",
    student5: "/images/avatars/student-5.png",
    student6: "/images/avatars/student-6.png",
  },

  branding: {
    vercel: "/vercel.svg",
    file: "/file.svg",
    window: "/window.svg",
  },
} as const;

/**
 * Get random avatar from available student avatars
 */
export function getRandomStudentAvatar(): string {
  const avatars = [
    ASSET_PATHS.avatars.student1,
    ASSET_PATHS.avatars.student2,
    ASSET_PATHS.avatars.student3,
    ASSET_PATHS.avatars.student4,
    ASSET_PATHS.avatars.student5,
    ASSET_PATHS.avatars.student6,
  ];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

/**
 * Get avatar by index (0-5)
 */
export function getStudentAvatarByIndex(index: number): string {
  const avatars = [
    ASSET_PATHS.avatars.student1,
    ASSET_PATHS.avatars.student2,
    ASSET_PATHS.avatars.student3,
    ASSET_PATHS.avatars.student4,
    ASSET_PATHS.avatars.student5,
    ASSET_PATHS.avatars.student6,
  ];
  return avatars[index % avatars.length];
}

/**
 * Type-safe asset path validator
 */
export function isValidAssetPath(path: string): boolean {
  const allPaths = Object.values(ASSET_PATHS).flatMap((category) =>
    Object.values(category as Record<string, string>)
  );
  return allPaths.includes(path);
}

export type AssetCategory = keyof typeof ASSET_PATHS;
export type AssetPath = (typeof ASSET_PATHS)[AssetCategory];
