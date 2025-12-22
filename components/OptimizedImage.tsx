import Image, { ImageProps } from 'next/image'

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string
  /** Fallback to JPEG/PNG if WebP not available */
  fallback?: string
}

/**
 * Optimized Image component with WebP support and automatic fallback
 * 
 * Features:
 * - Automatic WebP format with fallback to original
 * - Next.js Image optimization (responsive, lazy loading)
 * - Priority loading for above-the-fold images
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/images/hero-bg.webp"
 *   fallback="/images/hero-bg.jpg"
 *   alt="Hero background"
 *   width={1920}
 *   height={1080}
 *   priority
 * />
 * ```
 */
export function OptimizedImage({ src, fallback, alt, ...props }: OptimizedImageProps) {
  // If src is WebP and fallback provided, use picture tag for better browser support
  if (src.endsWith('.webp') && fallback) {
    return (
      <picture>
        <source srcSet={src} type="image/webp" />
        <Image src={fallback} alt={alt} {...props} />
      </picture>
    )
  }

  // Otherwise, use regular Next.js Image (already optimized)
  return <Image src={src} alt={alt} {...props} />
}

// Export default for easy import
export default OptimizedImage
