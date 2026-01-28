import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UGS Online School',
    short_name: 'UGS',
    description: '"勉強だけで終わらない" 「お金の知識×稼げる力」がコンセプトのビジネスコミュニティ',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#f97316',
    icons: [
      {
        src: '/ugs-logomark.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/ugs-logomark.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/ugs-logomark.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
