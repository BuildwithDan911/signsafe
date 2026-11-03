import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SignSafe — Check it before you sign it";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FBF8F1",
          padding: "48px",
          fontFamily: "serif",
        }}
      >
        {/* Paper card container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            width: "1080px",
            height: "520px",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            border: "2px solid rgba(20, 33, 61, 0.12)",
            padding: "56px 64px",
            boxShadow: "0 24px 48px -12px rgba(20, 33, 61, 0.15)",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderBottom: "2px solid #14213D",
              paddingBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#2FA36B",
                }}
              />
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#14213D",
                  letterSpacing: "-0.5px",
                }}
              >
                SignSafe
              </span>
            </div>
            <span
              style={{
                fontSize: "18px",
                fontFamily: "sans-serif",
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}
            >
              Document Safety Intelligence
            </span>
          </div>

          {/* Center body with Seal & Headline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              margin: "24px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "620px",
              }}
            >
              <h1
                style={{
                  fontSize: "52px",
                  fontWeight: "900",
                  color: "#14213D",
                  lineHeight: "1.15",
                  marginBottom: "16px",
                }}
              >
                Check it before you sign it.
              </h1>
              <p
                style={{
                  fontSize: "22px",
                  fontFamily: "sans-serif",
                  color: "#4B5563",
                  lineHeight: "1.4",
                }}
              >
                Job offers, contracts, tenancies, sponsorship deals, and invoices.
                Find the traps, ask the right questions, and get a fair version.
              </p>
            </div>

            {/* Embossed Notary Seal representation */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                backgroundColor: "#2FA36B",
                border: "8px double #FFFFFF",
                boxShadow: "0 12px 24px rgba(47, 163, 107, 0.3)",
                color: "#FFFFFF",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "sans-serif",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  marginBottom: "4px",
                }}
              >
                SIGNSAFE
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: "bold",
                  lineHeight: "1",
                }}
              >
                100
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "sans-serif",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  marginTop: "6px",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  padding: "4px 8px",
                  borderRadius: "12px",
                }}
              >
                LOOKS FAIR
              </span>
            </div>
          </div>

          {/* Footer row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderTop: "1px solid rgba(20, 33, 61, 0.1)",
              paddingTop: "20px",
              fontFamily: "sans-serif",
              fontSize: "16px",
              color: "#6B7280",
            }}
          >
            <span>Powered by 9 Clocked intelligence endpoints</span>
            <span style={{ fontWeight: "500", color: "#14213D" }}>
              SignSafe is not legal advice.
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
