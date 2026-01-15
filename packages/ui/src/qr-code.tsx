"use client";

import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";

export interface QRCodeProps {
  /**
   * The value to encode in the QR code
   */
  value: string;
  /**
   * Size of the QR code in pixels
   * @default 256
   */
  size?: number;
  /**
   * Background color
   * @default "#ffffff"
   */
  bgColor?: string;
  /**
   * Foreground color
   * @default "#000000"
   */
  fgColor?: string;
  /**
   * Error correction level
   * @default "M"
   */
  level?: "L" | "M" | "Q" | "H";
  /**
   * Include margin around QR code
   * @default true
   */
  includeMargin?: boolean;
  /**
   * Optional logo to display in center (data URL)
   */
  logo?: string;
  /**
   * Logo size ratio (0-1)
   * @default 0.2
   */
  logoSize?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * QR Code component for web applications
 * Generates a QR code from a string value
 */
export function QRCode({
  value,
  size = 256,
  bgColor = "#ffffff",
  fgColor = "#000000",
  level = "M",
  includeMargin = true,
  logo,
  logoSize = 0.2,
  className = "",
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const generateQR = async () => {
      try {
        // Generate QR code on canvas
        await QRCodeLib.toCanvas(canvas, value, {
          width: size,
          margin: includeMargin ? 4 : 0,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: level,
        });

        // Add logo if provided
        if (logo) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              const logoSizePx = size * logoSize;
              const x = (size - logoSizePx) / 2;
              const y = (size - logoSizePx) / 2;

              // Draw white background for logo
              ctx.fillStyle = bgColor;
              ctx.fillRect(x - 4, y - 4, logoSizePx + 8, logoSizePx + 8);

              // Draw logo
              ctx.drawImage(img, x, y, logoSizePx, logoSizePx);
            };
            img.src = logo;
          }
        }

        setError(null);
      } catch (err) {
        console.error("Failed to generate QR code:", err);
        setError("Failed to generate QR code");
      }
    };

    void generateQR();
  }, [value, size, bgColor, fgColor, level, includeMargin, logo, logoSize]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 text-red-600 ${className}`}
        style={{ width: size, height: size }}
      >
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Download QR code as PNG image
 */
export function downloadQRCode(value: string, filename = "qr-code.png") {
  QRCodeLib.toDataURL(value, { width: 512 }, (err, url) => {
    if (err) {
      console.error("Failed to generate QR code:", err);
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}
