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
  export type QRCodeToStringOptions = QRCodeToDataURLOptions & {
    type?: "utf8" | "svg" | "terminal";
  };
  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeToDataURLOptions): Promise<void>;
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
}
