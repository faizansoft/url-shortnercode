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
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeToDataURLOptions): Promise<void>;
}
