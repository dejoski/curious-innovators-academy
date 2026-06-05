export function BrandAppIconImageResponseRoot({
  cornerRadius,
  dot,
}: {
  cornerRadius: number;
  dot: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND_ICON_BG,
        borderRadius: cornerRadius,
      }}
    >
      <div
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: BRAND_ICON_ACCENT,
        }}
      />
    </div>
  );
}
