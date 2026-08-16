import "./globals.css";

export const metadata = {
  title: "Glub — your blob companion",
  description: "A tiny interactive blob you can poke, tickle, rub to sleep, and (gently, please) boop.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
