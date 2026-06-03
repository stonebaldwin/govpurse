import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Govpurse',
    short_name: 'Govpurse',
    description: 'Follow the money in your local government.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4efe4',
    theme_color: '#16774a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
