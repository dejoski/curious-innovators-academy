import { expect, test } from "@playwright/test";

const MOBILE_ROUTES = [
  "/login",
  "/dashboard",
  "/dashboard/classes",
  "/dashboard/students",
  "/dashboard/parents/students",
  "/dashboard/settings",
];

type OverflowOffender = {
  tag: string;
  className: string;
  text: string;
  left: number;
  right: number;
  width: number;
};

type OverflowReport = {
  bodyScrollWidth: number;
  docScrollWidth: number;
  mainClientWidth: number | null;
  mainScrollWidth: number | null;
  offenders: OverflowOffender[];
  viewport: number;
};

test.describe("mobile responsive layout", () => {
  test.use({
    deviceScaleFactor: 2,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  for (const route of MOBILE_ROUTES) {
    test(`${route} does not create page-level horizontal overflow`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const report = await page.evaluate<OverflowReport>(() => {
        const viewport = window.innerWidth;
        const doc = document.documentElement;
        const main = document.querySelector("main");

        function hasScrollableAncestor(el: Element) {
          let node: Element | null = el;
          while (node) {
            const style = window.getComputedStyle(node);
            const overflowX = style.overflowX;
            if (
              (overflowX === "auto" || overflowX === "scroll") &&
              node.scrollWidth > node.clientWidth + 1
            ) {
              return true;
            }
            node = node.parentElement;
          }
          return false;
        }

        const offenders: OverflowOffender[] = [];
        for (const el of Array.from(document.body.querySelectorAll("*"))) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) continue;
          if (rect.left < -1 || rect.right > viewport + 1) {
            if (hasScrollableAncestor(el)) continue;
            offenders.push({
              tag: el.tagName.toLowerCase(),
              className:
                typeof el.className === "string"
                  ? el.className.slice(0, 120)
                  : "",
              text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 100),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            });
          }
        }

        return {
          bodyScrollWidth: document.body.scrollWidth,
          docScrollWidth: doc.scrollWidth,
          mainClientWidth: main?.clientWidth ?? null,
          mainScrollWidth: main?.scrollWidth ?? null,
          offenders: offenders.slice(0, 10),
          viewport,
        };
      });

      expect(report.docScrollWidth, JSON.stringify(report, null, 2)).toBeLessThanOrEqual(
        report.viewport + 1,
      );
      expect(report.bodyScrollWidth, JSON.stringify(report, null, 2)).toBeLessThanOrEqual(
        report.viewport + 1,
      );
      expect(report.offenders, JSON.stringify(report, null, 2)).toEqual([]);
      if (report.mainScrollWidth !== null && report.mainClientWidth !== null) {
        expect(report.mainScrollWidth, JSON.stringify(report, null, 2)).toBeLessThanOrEqual(
          report.mainClientWidth + 1,
        );
      }
    });
  }
});
