declare module 'qrcode-generator' {
  type ECLevel = 'L' | 'M' | 'Q' | 'H';
  interface QR {
    addData(data: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
  }
  function QRCode(version: number, errorCorrectionLevel: ECLevel): QR;
  export default QRCode;
}
