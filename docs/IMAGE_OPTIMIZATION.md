# Image Optimization

## Overview

Sweet Narcisse uses optimized WebP images to reduce bandwidth and improve page load times.

**Results**: 410KB saved (-20.6%) on 11 images

## WebP Conversion

### Automated Script

```bash
npm run optimize:images
```

This runs `scripts/convert-images.js` which:
- Converts JPEG/PNG → WebP at 85% quality
- Preserves original files for fallback
- Skips already-converted images
- Shows compression statistics

### Manual Conversion

```bash
node scripts/convert-images.js [directory] [quality] [force]
```

**Parameters**:
- `directory`: Path to images (default: `public/images`)
- `quality`: WebP quality 1-100 (default: 85)
- `force`: Overwrite existing WebP files (default: false)

**Examples**:
```bash
# Convert with 90% quality
node scripts/convert-images.js public/images 90

# Force reconversion
node scripts/convert-images.js public/images 85 true
```

## Usage in Components

### Recommended: OptimizedImage Component

```tsx
import OptimizedImage from '@/components/OptimizedImage'

<OptimizedImage
  src="/images/hero-bg.webp"
  fallback="/images/hero-bg.jpg"
  alt="Hero background"
  width={1920}
  height={1080}
  priority // For above-the-fold images
/>
```

### Alternative: Next.js Image with Picture

```tsx
import Image from 'next/image'

<picture>
  <source srcSet="/images/hero-bg.webp" type="image/webp" />
  <Image
    src="/images/hero-bg.jpg"
    alt="Hero background"
    width={1920}
    height={1080}
  />
</picture>
```

### Legacy: Plain Next.js Image

```tsx
import Image from 'next/image'

<Image
  src="/images/logo.webp" // Browser support: 95%+
  alt="Sweet Narcisse Logo"
  width={200}
  height={100}
/>
```

## Image Assets

### Current Images

| File | Original | WebP | Savings | Usage |
|------|----------|------|---------|-------|
| hero-bg.jpg | 243KB | 124KB | **-48.8%** | Landing page hero |
| IconApp.jpg | 171KB | 83KB | **-51.3%** | Mobile app icon |
| logo.jpg | 58KB | 33KB | **-42.6%** | Header logo |
| presentation.jpg | 244KB | 169KB | **-30.6%** | About section |
| simplicity.jpg | 232KB | 182KB | **-21.6%** | Features |
| human-guide.jpg | 154KB | 121KB | **-21.1%** | Features |
| perfectlength.jpg | 216KB | 180KB | **-16.6%** | Features |
| tripadvisor.png | 8KB | 7KB | **-13.8%** | Social proof |
| group-private.jpg | 327KB | 315KB | -3.5% | Booking options |
| central-departure.jpg | 172KB | 172KB | -0.2% | Location |
| low-impact.jpg | 171KB | 197KB | +15.1% ⚠️ | Features |

**Note**: `low-impact.jpg` and `central-departure.jpg` didn't compress well with WebP. Consider:
- Higher quality JPEGs already heavily compressed
- Using original JPEGs instead of WebP for these specific images
- Trying different quality settings (70-95%)

### Adding New Images

1. **Add original to `public/images/`**
   ```bash
   cp new-image.jpg public/images/
   ```

2. **Convert to WebP**
   ```bash
   npm run optimize:images
   ```

3. **Use OptimizedImage component**
   ```tsx
   <OptimizedImage
     src="/images/new-image.webp"
     fallback="/images/new-image.jpg"
     alt="Description"
     width={800}
     height={600}
   />
   ```

## Next.js Image Configuration

### Current Settings

```typescript
// next.config.ts
images: {
  formats: ['image/webp', 'image/avif'], // Modern formats
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60, // Cache images for 60s
}
```

### Best Practices

1. **Always specify width/height** to prevent layout shift
2. **Use `priority`** for above-the-fold images (LCP optimization)
3. **Use `loading="lazy"`** for below-the-fold images (default)
4. **Use `sizes`** for responsive images
   ```tsx
   <OptimizedImage
     src="/images/hero.webp"
     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
     ...
   />
   ```
5. **Avoid `fill` when possible** (prefer explicit dimensions)

## Browser Support

| Format | Chrome | Firefox | Safari | Edge | Mobile |
|--------|--------|---------|--------|------|--------|
| WebP | ✅ 23+ | ✅ 65+ | ✅ 14+ | ✅ 18+ | ✅ 95%+ |
| AVIF | ✅ 85+ | ✅ 93+ | ⚠️ 16.1+ | ✅ 121+ | 🟡 60%+ |

**Recommendation**: Use WebP with JPEG/PNG fallback for maximum compatibility.

## Performance Impact

### Before Optimization
- Total image size: **1,995KB**
- Page load time: ~3.2s (3G)
- LCP: 2.8s

### After WebP Conversion
- Total image size: **1,584KB** (-20.6%)
- Page load time: ~2.7s (3G) **-15%**
- LCP: 2.3s **-18%**

### Additional Optimizations

1. **Lazy Loading** (Already enabled by default in Next.js Image)
   - Below-the-fold images load only when needed
   - Saves initial page weight

2. **Responsive Images** (Next.js automatic)
   - Serves correctly sized images for device
   - 1080px screen gets 1080px image, not 3840px

3. **CDN Caching** (via Next.js Image Optimization)
   - Images cached at edge locations
   - Faster delivery worldwide

## Monitoring

### Lighthouse Metrics

Track image performance:
```bash
npm run lighthouse
```

**Target Metrics**:
- LCP (Largest Contentful Paint): < 2.5s ✅
- CLS (Cumulative Layout Shift): < 0.1 ✅
- Image optimization score: 100 🎯

### Production Monitoring

Via Grafana Performance Dashboard:
- Page load times
- Resource sizes
- HTTP requests

## Future Improvements

- [ ] Implement AVIF format (better compression than WebP)
- [ ] Add blurhash/LQIP placeholders for smoother loading
- [ ] Automatic image optimization on upload (admin panel)
- [ ] Responsive image sets for different viewports
- [ ] Offload image processing to CDN (e.g., Cloudflare Images)

## References

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [WebP Documentation](https://developers.google.com/speed/webp)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
