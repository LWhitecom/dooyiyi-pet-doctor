import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const jobs = [
  ['src/assets/images/cutout/登录界面.png', 'src/assets/previews/auth/login.webp', 1000],
  ['src/assets/images/cutout/注册页面.png', 'src/assets/previews/auth/signup.webp', 1000],
  ['src/assets/images/cutout/忘记密码界面.png', 'src/assets/previews/auth/reset.webp', 1000],
  ['src/assets/images/cutout/首页替换照片1.png', 'src/assets/previews/hero/main-photo.webp', 1000],
  ['src/assets/images/cutout/抠图素材图3.png', 'src/assets/previews/hero/q-character.webp', 900],
  ['src/assets/images/cutout/单个抠图元素3.png', 'src/assets/previews/hero/cat-a.webp', 500],
  ['src/assets/images/cutout/单个抠图元素1.png', 'src/assets/previews/hero/cat-b.webp', 500],
  ['src/assets/images/cutout/抠图素材图8.png', 'src/assets/previews/loading/illustration.webp', 900],
  ...[1, 2, 3, 4, 5].map((number) => [`src/assets/images/cutout/轮播图${number}.png`, `src/assets/previews/carousel/card-${number}.webp`, 900]),
]

for (const [source, output, maxSide] of jobs) {
  const outputPath = path.join(root, output)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await sharp(path.join(root, source))
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, smartSubsample: true })
    .toFile(outputPath)
}
