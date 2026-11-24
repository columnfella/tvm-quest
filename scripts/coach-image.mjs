// Builds the coach cut-out the app loads (public/assets/leo_coach.webp) from the original picture
// (public/assets/leo_coach.png): trims the transparent border, caps the width at 400 px (2× the size it is
// shown at) and saves a small WebP with transparency.
//
//   npm run coach:image                       → leo_coach.png → leo_coach.webp
//   npm run coach:image -- other.png new.webp → any file in public/assets
//
// Uses sharp, which Next.js already installs for image optimisation.
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'public', 'assets');
const [src = 'leo_coach.png', out = 'leo_coach.webp'] = process.argv.slice(2);

const trimmed = await sharp(path.join(dir, src)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
await sharp(trimmed.data)
  .resize({ width: Math.min(trimmed.info.width, 400) })
  .webp({ quality: 86, alphaQuality: 90 })
  .toFile(path.join(dir, out));
const meta = await sharp(path.join(dir, out)).metadata();
console.log(`${src} → ${out}: ${meta.width}×${meta.height}`);
