declare module "qrcode" {
  export type QRCodeToDataURLOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    color?: { dark?: string; light?: string };
    width?: number;
    scale?: number;
    version?: number;
    maskPattern?: number;
  };
  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
}
