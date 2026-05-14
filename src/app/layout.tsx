import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const APP_DESCRIPTION =
  "School hub for Curious Innovators Academy — roster, classes, schedules, and family-facing tools.";

export const metadata: Metadata = {
  applicationName: "Curious Innovators Academy",
  title: {
    default: "Curious Innovators Academy",
    template: "%s · Curious Innovators Academy",
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    title: "Curious Innovators Academy",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#05080b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col">
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function readHashParams() {
                  var hash = window.location.hash || "";
                  if (!hash) return null;
                  var q = hash.charAt(0) === "#" ? hash.slice(1) : hash;
                  var params = new URLSearchParams(q);
                  var captureId = params.get("figmacapture");
                  var endpoint = params.get("figmaendpoint");
                  var delay = Number(params.get("figmadelay") || "1000");
                  if (!captureId) return null;
                  return { captureId: captureId, endpoint: endpoint, delay: Number.isFinite(delay) ? delay : 1000 };
                }

                function trySubmitCapture() {
                  var cfg = readHashParams();
                  if (!cfg || !window.figma || typeof window.figma.captureForDesign !== "function") return false;
                  window.setTimeout(function () {
                    var payload = {
                      captureId: cfg.captureId,
                      selector: "body"
                    };
                    if (cfg.endpoint) payload.endpoint = cfg.endpoint;
                    window.figma.captureForDesign(payload);
                  }, cfg.delay);
                  return true;
                }

                if (typeof window !== "undefined") {
                  if (!trySubmitCapture()) {
                    var tries = 0;
                    var timer = window.setInterval(function () {
                      tries += 1;
                      if (trySubmitCapture() || tries > 40) window.clearInterval(timer);
                    }, 250);
                  }
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
