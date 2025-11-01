export const metadata = {
  title: "Catálogo Ferreluc",
  description: "Catálogo web desde JSON",
};

import "@/styles/globals.css";
import { CartProvider } from "@/components/CartContext";
import HeaderCart from "@/components/HeaderCart";

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <CartProvider>
          <HeaderCart />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
