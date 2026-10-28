import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OneDesk — All-in-One Project Management & Team Collaboration',
  description:
    'A project-centric, role-based work management and team collaboration platform with centralized cross-project visibility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#F0F1F3] text-[#18251D] selection:bg-[#20E34A] selection:text-[#06351F]">
        {children}
      </body>
    </html>
  );
}

