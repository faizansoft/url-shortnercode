declare module "qr-code-styling" {
  export type Gradient = {
    type?: "linear" | "radial";
    rotation?: number; // 0..360
    colorStops: { offset: number; color: string }[];
  };

  export type DotsOptions = {
    type?: "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded";
    color?: string;
    gradient?: Gradient;
  };

  export type CornersSquareOptions = {
    type?: "dot" | "square" | "extra-rounded";
    color?: string;
    gradient?: Gradient;
  };

  export type CornersDotOptions = {
    type?: "dot" | "square";
    color?: string;
    gradient?: Gradient;
  };

  export type BackgroundOptions = {
    color?: string;
    gradient?: Gradient;
  };

  export type ImageOptions = {
    crossOrigin?: string;
    margin?: number;
    imageSize?: number; // 0..1 relative size
    hideBackgroundDots?: boolean;
    image?: string;
  };

  export interface Options {
    width?: number;
    height?: number;
    type?: "svg" | "canvas";
    data?: string;
    margin?: number;
    qrOptions?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" };
    backgroundOptions?: BackgroundOptions;
    dotsOptions?: DotsOptions;
    cornersSquareOptions?: CornersSquareOptions;
    cornersDotOptions?: CornersDotOptions;
    image?: string; // root image source (many versions of qr-code-styling expect this)
    imageOptions?: ImageOptions;
  }

  export default class QRCodeStyling {
    constructor(options?: Options);
    update(options?: Options): void;
    append(element: HTMLElement): void;
    download(opts?: { name?: string; extension?: "png" | "svg" | "jpeg" }): void;
    getRawData(extension?: "png" | "svg" | "jpeg"): Promise<Blob | null>;
  }
}
