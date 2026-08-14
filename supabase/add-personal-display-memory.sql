-- 为“关于我主照片”和“回忆轮播”增加与照片墙相同账号的云端记忆。
-- 在 Supabase Dashboard > SQL Editor 执行一次即可；不会修改已有照片墙数据。
alter table public.photo_wall_states
  add column if not exists profile_photo jsonb,
  add column if not exists finale_cards jsonb not null default '[]'::jsonb;
