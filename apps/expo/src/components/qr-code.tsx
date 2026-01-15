import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

export interface QRCodeDisplayProps {
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
   * @default "white"
   */
  backgroundColor?: string;
  /**
   * Foreground color
   * @default "black"
   */
  color?: string;
  /**
   * Optional logo to display in center (require/import)
   */
  logo?: any;
  /**
   * Logo size in pixels
   * @default 50
   */
  logoSize?: number;
  /**
   * Logo background color
   * @default "white"
   */
  logoBackgroundColor?: string;
}

/**
 * QR Code display component for React Native
 * Shows a QR code for reservation verification
 */
export function QRCodeDisplay({
  value,
  size = 256,
  backgroundColor = "white",
  color = "black",
  logo,
  logoSize = 50,
  logoBackgroundColor = "white",
}: QRCodeDisplayProps) {
  return (
    <View
      style={{
        padding: 16,
        backgroundColor,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <QRCode
        value={value}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        logo={logo}
        logoSize={logoSize}
        logoBackgroundColor={logoBackgroundColor}
        logoBorderRadius={4}
      />
    </View>
  );
}
