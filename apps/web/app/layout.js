import './globals.css';

export const metadata = { title: 'Jurnal Digital PKL', description: 'Sistem Informasi & Jurnal Digital PKL' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
