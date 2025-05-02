import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simterview | AI-Powered Technical & Behavioral Interview Practice",
  description: "Master software engineering interviews with Simterview's AI-powered mock interviews. Practice technical coding problems, behavioral questions, and get instant feedback to land your dream job at FAANG companies.",
  keywords: "technical interview preparation, coding interview practice, software engineering interviews, behavioral interview practice, AI mock interviews, software developer career prep, FAANG interview practice, tech interview simulator, programming interview questions, software engineer job preparation",
  robots: "index, follow",
  authors: [{ name: "RainSong Software" }],
  // openGraph: {
  //   title: "Simterview | AI-Powered Technical & Behavioral Interview Practice",
  //   description: "Master software engineering interviews with Simterview's AI-powered mock interviews and land your dream job at FAANG companies.",
  //   url: "https://simterview.com",
  //   siteName: "Simterview",
  //   images: [
  //     {
  //       url: "/icon.png",
  //       width: 800,
  //       height: 600,
  //     },
  //   ],
  //   locale: "en_US",
  //   type: "website",
  // },
  // twitter: {
  //   card: "summary_large_image",
  //   title: "Simterview | AI-Powered Technical & Behavioral Interview Practice",
  //   description: "Master software engineering interviews with Simterview's AI-powered mock interviews and land your dream job at FAANG companies.",
  //   images: ["/icon.png"],
  // },
  icons: {
    icon: '/icon.png',
  },
  alternates: {
    canonical: 'https://simterview.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Simterview",
              "description": "AI-powered software engineering interview practice platform",
              "applicationCategory": "Education, Professional Development",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "RainSong Software"
              },
              "audience": {
                "@type": "Audience",
                "audienceType": "Software Engineers, Programmers, Computer Science Students"
              }
            })
          }}
        />
      </head>
      <body
        className={`${inter.className} antialiased pattern`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
