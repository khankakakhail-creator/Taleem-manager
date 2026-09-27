export const metadata = {
  title: "Taleem Manager",
  description: "Quran Academy Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
