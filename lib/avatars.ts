// Pick-one profile pictures (Microsoft Fluent Emoji, MIT), served from /public/assets.
export const AVATARS = [
  'pig_face_3d.png',
  'fox_3d.png',
  'cat_face_3d.png',
  'frog_3d.png',
  'unicorn_3d.png',
  'dragon_face_3d.png',
  'owl_3d.png',
  'panda_3d.png',
  'tiger_face_3d.png',
  'penguin_3d.png',
  'lion_3d.png',
  'monkey_face_3d.png',
  'bear_3d.png',
  'hatching_chick_3d.png',
  'robot_3d.png',
  'alien_monster_3d.png',
  'ghost_3d.png',
  'smiling_face_with_sunglasses_3d.png',
] as const;

export type Avatar = (typeof AVATARS)[number];
export const isAvatar = (v: unknown): v is Avatar => typeof v === 'string' && (AVATARS as readonly string[]).includes(v);
