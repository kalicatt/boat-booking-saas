import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sweet Narcisse',
    short_name: 'Sweet Narcisse',
    description: 'Promenades en barque à Colmar',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      { src: '/images/logo.jpg', sizes: '192x192', type: 'image/jpeg' },
      { src: '/images/logo.jpg', sizes: '512x512', type: 'image/jpeg' },
      { src: '/images/logo.jpg', sizes: '1024x1024', type: 'image/jpeg', purpose: 'any maskable' },
    ],
  }
}
