import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1814",
        borderRadius: 36,
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a5c9e" />
            <stop offset="100%" stopColor="#d1643d" />
          </linearGradient>
        </defs>
        <path
          d="M30.2 1.8c-1.1-1.1-3-.9-4.3.4L19.5 8.6l-14-4.2c-.4-.1-.9 0-1.2.3L2.1 6.9c-.4.4-.4 1 0 1.3l10 6.5-4.8 4.8-3.5-.7c-.4-.1-.8 0-1 .3l-1.5 1.5c-.3.3-.3.9.1 1.2l4.2 2.6 2.6 4.2c.3.4.8.5 1.2.1l1.5-1.5c.3-.3.3-.7.3-1l-.7-3.5 4.8-4.8 6.5 10c.4.4 1 .4 1.3 0l2.2-2.2c.3-.3.4-.8.3-1.2l-4.2-14 6.4-6.4c1.3-1.3 1.5-3.2.4-4.3z"
          fill="url(#g)"
        />
      </svg>
    </div>,
    { ...size },
  );
}
