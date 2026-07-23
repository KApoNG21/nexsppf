import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "NEXS PPF | Digital Warranty";
  const description = "NEXS Paint Protection Film พร้อมระบบตรวจสอบบัตรรับประกันดิจิทัลผ่าน QR Code และ Serial Number";
  return {
    metadataBase,
    title: { default: title, template: "%s | NEXS PPF" },
    description,
    keywords: ["NEXS", "PPF", "paint protection film", "digital warranty", "ฟิล์มกันรอยรถยนต์"],
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "64x64" }] },
    openGraph: { title, description, images: [{ url: "/og.png", width: 1664, height: 936, alt: "NEXS PPF - Engineered to be Invisible" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
