import { ImageResponse } from "next/og";
import { PAPER_NAME, SCHOOL_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fdfdfb",
        color: "#141414",
      }}
    >
      <div
        style={{
          borderTop: "1px solid #141414",
          borderBottom: "1px solid #141414",
          padding: "6px 0",
          display: "flex",
        }}
      >
      <div
        style={{
          borderTop: "3px solid #141414",
          borderBottom: "3px solid #141414",
          padding: "32px 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: 2 }}>
          {PAPER_NAME}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          {SCHOOL_NAME}
        </div>
      </div>
      </div>
    </div>,
    size,
  );
}
