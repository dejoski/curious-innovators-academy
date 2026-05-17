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

const shouldLoadFigmaCapture = process.env.NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE === "true";

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
        {shouldLoadFigmaCapture ? (
          <>
            <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
            <script
              dangerouslySetInnerHTML={{
                __html: `
              (function () {
                var submittedCaptureId = null;
                var scriptRequested = false;

                function readHashParams() {
                  var hash = window.location.hash || "";
                  var search = window.location.search || "";
                  var fromHash = hash ? new URLSearchParams(hash.charAt(0) === "#" ? hash.slice(1) : hash) : null;
                  var fromSearch = search ? new URLSearchParams(search.charAt(0) === "?" ? search.slice(1) : search) : null;
                  var params = fromHash && fromHash.get("figmacapture") ? fromHash : fromSearch;
                  if (!params) return null;
                  var captureId = params.get("figmacapture");
                  var endpoint = params.get("figmaendpoint") || params.get("endpoint");
                  var delay = Number(params.get("figmadelay") || "1000");
                  if (!captureId) return null;
                  if (!endpoint) endpoint = "https://mcp.figma.com/mcp/capture/" + encodeURIComponent(captureId) + "/submit";
                  return { captureId: captureId, endpoint: endpoint, delay: Number.isFinite(delay) ? delay : 1000 };
                }

                function ensureCaptureScriptLoaded() {
                  if (scriptRequested || (window.figma && typeof window.figma.captureForDesign === "function")) return;
                  scriptRequested = true;
                  var existing = document.querySelector("script[data-cia-figma-capture='1']");
                  if (existing) return;
                  var s = document.createElement("script");
                  s.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
                  s.async = true;
                  s.setAttribute("data-cia-figma-capture", "1");
                  s.onload = function () {
                    trySubmitCapture();
                  };
                  document.head.appendChild(s);
                }

                function trySubmitCapture() {
                  var cfg = readHashParams();
                  if (!cfg || !window.figma || typeof window.figma.captureForDesign !== "function") return false;
                  if (submittedCaptureId === cfg.captureId) return true;
                  window.setTimeout(function () {
                    if (submittedCaptureId === cfg.captureId) return;
                    var payload = {
                      captureId: cfg.captureId,
                      selector: "body"
                    };
                    if (cfg.endpoint) payload.endpoint = cfg.endpoint;
                    window.figma.captureForDesign(payload);
                    submittedCaptureId = cfg.captureId;
                  }, cfg.delay);
                  return true;
                }

                if (typeof window !== "undefined") {
                  if (readHashParams()) ensureCaptureScriptLoaded();
                  trySubmitCapture();
                  var tries = 0;
                  var timer = window.setInterval(function () {
                    tries += 1;
                    if (readHashParams()) ensureCaptureScriptLoaded();
                    if (trySubmitCapture() || tries > 240) window.clearInterval(timer);
                  }, 250);

                  window.addEventListener("load", trySubmitCapture);
                  window.addEventListener("hashchange", trySubmitCapture);
                }
              })();
            `,
              }}
            />
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
