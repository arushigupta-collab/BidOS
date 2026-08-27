import embLogo from '@/assets/emb-logo.png'
import { cn } from '@/lib/cn'

/**
 * The EMB Global logo, the official asset.
 *
 * Imported rather than referenced by path: the build inlines it as a base64 data
 * URI (see build.assetsInlineLimit in vite.config.ts), so dist/ makes no request
 * for it and it renders from file://.
 *
 * OPEN ITEM: this is a raster. It does not invert with the theme, so on the dark
 * theme the charcoal wordmark sits on a dark canvas at low contrast, and it does
 * not resample above its native 179x79. Replace with the official SVG when one is
 * available; at that point the wordmark can take the foreground token and the
 * leaf cluster can keep the brand green, as the reconstruction it replaced did.
 *
 * The intrinsic dimensions are declared so the aspect ratio is the file's own and
 * the corner reserves its space before the image decodes.
 */

const NATIVE_WIDTH = 179
const NATIVE_HEIGHT = 79

/**
 * `alt` is overridable so the logo can be dropped to presentational when it sits
 * inside a link that already carries a name — two names for one control is worse
 * than one good one. It defaults to the brand for the standalone case.
 */
export function EmbLogo({ className, alt = 'EMB Global' }: { className?: string; alt?: string }) {
  return (
    <img
      src={embLogo}
      alt={alt}
      width={NATIVE_WIDTH}
      height={NATIVE_HEIGHT}
      className={cn('h-logo w-auto', className)}
    />
  )
}
