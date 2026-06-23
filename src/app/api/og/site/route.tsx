import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#f7f3ea",
                    color: "#0f172a",
                    padding: "72px",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div
                        style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "14px",
                            background: "#16324f",
                        }}
                    />
                    <div style={{ fontSize: "40px", fontWeight: 800 }}>Aganyu</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
                    <div
                        style={{
                            display: "flex",
                            width: "fit-content",
                            borderRadius: "999px",
                            background: "#ffffff",
                            border: "1px solid #d8d2c5",
                            padding: "12px 22px",
                            color: "#16324f",
                            fontSize: "24px",
                            fontWeight: 700,
                        }}
                    >
                        Malawi-first hiring
                    </div>
                    <div style={{ fontSize: "76px", lineHeight: 1.02, fontWeight: 800, maxWidth: "940px" }}>
                        Find focused roles and trusted talent on Aganyu.
                    </div>
                    <div style={{ color: "#475569", fontSize: "30px", maxWidth: "820px", lineHeight: 1.35 }}>
                        Remote, hybrid, and on-site opportunities with privacy-first job matching.
                    </div>
                </div>

                <div style={{ display: "flex", gap: "18px", color: "#16324f", fontSize: "24px", fontWeight: 700 }}>
                    <span>Verified employers</span>
                    <span>•</span>
                    <span>Structured profiles</span>
                    <span>•</span>
                    <span>Privacy built in</span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
