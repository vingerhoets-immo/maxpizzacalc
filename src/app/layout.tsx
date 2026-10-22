import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Nunito } from 'next/font/google';
import './globals.css';

const archivo = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });
export const metadata: Metadata = { title: 'Teigzeit', description: 'Dein Pizza-Teig-Rechner und Kreationenbuch', manifest: '/manifest.json', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Teigzeit' }, icons: { apple: '/apple-touch-icon.png', icon: '/icon.png' } };
export const viewport: Viewport = { themeColor: '#FFD93D', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body className={`${archivo.variable} ${nunito.variable}`}>{children}</body></html>; }
