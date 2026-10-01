import './globals.css';

export const metadata = {
  title: 'GoodNews Baby — Prediction Games',
  description: 'Create a beautiful personalized baby prediction game for family and friends.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
