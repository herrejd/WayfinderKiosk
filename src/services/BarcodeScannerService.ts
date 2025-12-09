/**
 * BarcodeScannerService - Camera barcode scanning with PDF417 support
 *
 * Uses @zxing/browser and @zxing/library to scan boarding passes.
 * Boarding passes use IATA Bar Coded Boarding Pass (BCBP) format in PDF417 2D barcodes.
 *
 * IMPORTANT: Uses zxing-js, NOT QuaggaJS, because boarding passes use PDF417
 * which QuaggaJS doesn't support.
 */

import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import type { Result } from '@zxing/library';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import type { BoardingPassData } from '@/types/wayfinder';

/**
 * IATA BCBP (Bar Coded Boarding Pass) format parser
 *
 * Format specification:
 * - Field 1: Format code (M = mandatory, O = optional)
 * - Field 2: Number of legs (1-4)
 * - Field 3: Passenger name
 * - Field 4: E-ticket indicator
 * - Followed by leg-specific data
 */
class BCBPParser {
  /**
   * Parse IATA BCBP barcode data
   * @param rawData - Raw barcode string
   * @returns Parsed boarding pass data
   */
  static parse(rawData: string): BoardingPassData | null {
    if (!rawData || rawData.length < 60) {
      return null;
    }

    try {
      // BCBP format starts with 'M' (mandatory) or 'O' (optional)
      const formatCode = rawData.charAt(0);
      if (formatCode !== 'M' && formatCode !== 'O') {
        return null;
      }

      // Number of legs encoded
      const numLegs = parseInt(rawData.charAt(1), 10);
      if (isNaN(numLegs) || numLegs < 1 || numLegs > 4) {
        return null;
      }

      // Passenger name (2-22): Last name + / + First name
      const passengerName = rawData.substring(2, 22).trim();

      // E-ticket indicator (22)
      // const eTicketFlag = rawData.charAt(22);

      // Operating carrier PNR code / Confirmation code (23-29)
      const confirmationCode = rawData.substring(23, 30).trim();

      // From city airport code (30-32)
      // const fromCity = rawData.substring(30, 33);

      // To city airport code (33-35)
      // const toCity = rawData.substring(33, 36);

      // Operating carrier designator (36-38)
      const airline = rawData.substring(36, 39).trim();

      // Flight number (39-43)
      const flightNumber = rawData.substring(39, 44).trim();

      // Date of flight (Julian date) (44-46)
      const julianDate = rawData.substring(44, 47);
      const departureTime = this.parseJulianDate(julianDate);

      // Compartment code (47) - class of service
      // const compartmentCode = rawData.charAt(47);

      // Seat number (48-51)
      const seatNumber = rawData.substring(48, 52).trim();

      // Check-in sequence number (52-56)
      // const sequenceNumber = rawData.substring(52, 57).trim();

      // Passenger status (57) - boarding group indicator
      const passengerStatus = rawData.charAt(57);

      // Extract gate and boarding time from conditional section if present
      let gate: string | undefined;
      let boardingTime: string | undefined;
      let boardingGroup: string | undefined;

      // Conditional section starts after position 58
      if (rawData.length > 58) {
        // Try to extract gate from conditional data
        // Gate is typically in positions 58-62 but varies by airline
        const conditionalData = rawData.substring(58);

        // Look for gate pattern (1-3 alphanumeric characters)
        const gateMatch = conditionalData.match(/[A-Z]?\d{1,3}[A-Z]?/);
        if (gateMatch) {
          gate = gateMatch[0];
        }

        // Boarding group is often derived from passenger status
        if (passengerStatus >= '1' && passengerStatus <= '9') {
          boardingGroup = `Group ${passengerStatus}`;
        }
      }

      return {
        flightNumber: `${airline}${flightNumber}`,
        airline: airline,
        gate: gate,
        departureTime: departureTime,
        passengerName: passengerName.replace(/\//g, ' '),
        seatNumber: seatNumber || undefined,
        boardingGroup: boardingGroup,
        boardingTime: boardingTime,
        barcode: rawData,
        confirmationCode: confirmationCode,
      };
    } catch (error) {
      console.error('Error parsing BCBP data:', error);
      return null;
    }
  }

  /**
   * Convert Julian date to readable format
   * @param julianDate - Three-digit Julian date (day of year)
   * @returns Formatted date string
   */
  private static parseJulianDate(julianDate: string): string {
    try {
      const dayOfYear = parseInt(julianDate, 10);
      if (isNaN(dayOfYear)) {
        return 'Unknown';
      }

      // Assume current year (barcode doesn't encode year)
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, 0, dayOfYear);

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return 'Unknown';
    }
  }
}

type ScanResultCallback = (data: BoardingPassData) => void;
type ScanErrorCallback = (error: string) => void;

class BarcodeScannerService {
  private reader: BrowserMultiFormatReader;
  private controls: IScannerControls | null = null;
  private isScanning = false;

  constructor() {
    // Initialize reader with hint for PDF417 format
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.PDF_417, // Boarding passes
      BarcodeFormat.QR_CODE, // Some airlines use QR codes
      BarcodeFormat.AZTEC, // Alternative format
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.reader = new BrowserMultiFormatReader(hints);
  }

  /**
   * Start scanning for barcodes using the device camera
   * @param videoElement - HTML video element to display camera feed
   * @param onResult - Callback when a boarding pass is successfully scanned
   * @param onError - Callback when an error occurs
   */
  async startScanning(
    videoElement: HTMLVideoElement,
    onResult: ScanResultCallback,
    onError?: ScanErrorCallback
  ): Promise<void> {
    if (this.isScanning) {
      console.warn('Scanner is already running');
      return;
    }

    try {
      // Get list of video input devices
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('No camera found on this device');
      }

      // Prefer back camera on mobile devices
      let selectedDevice = videoInputDevices[0];
      for (const device of videoInputDevices) {
        if (device.label.toLowerCase().includes('back')) {
          selectedDevice = device;
          break;
        }
      }

      // Start decoding from video
      this.controls = await this.reader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoElement,
        (result, error, _controls) => {
          if (result) {
            this.handleScanResult(result, onResult, onError);
          }

          // Only log errors that aren't "not found" (too noisy)
          if (error && error.name !== 'NotFoundException') {
            console.error('Scan error:', error);
          }
        }
      );

      this.isScanning = true;
    } catch (error) {
      console.error('Error starting scanner:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start camera';
      onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Stop scanning and release camera
   */
  stopScanning(): void {
    if (this.controls) {
      this.controls.stop();
      this.controls = null;
    }
    this.isScanning = false;
  }

  /**
   * Handle successful barcode scan
   * @private
   */
  private handleScanResult(
    result: Result,
    onResult: ScanResultCallback,
    onError?: ScanErrorCallback
  ): void {
    const rawData = result.getText();
    console.log('Barcode scanned:', rawData);

    // Parse IATA BCBP format
    const boardingPass = BCBPParser.parse(rawData);

    if (boardingPass) {
      // Stop scanning after successful read
      this.stopScanning();
      onResult(boardingPass);
    } else {
      // Invalid barcode format
      const errorMsg = 'Invalid boarding pass format';
      console.warn(errorMsg, rawData);
      onError?.(errorMsg);
    }
  }

  /**
   * Check if scanner is currently active
   */
  isActive(): boolean {
    return this.isScanning;
  }

  /**
   * Reset the scanner (stop and release resources)
   */
  reset(): void {
    this.stopScanning();
  }

  /**
   * Get available camera devices
   * @returns List of video input devices
   */
  async getCameraDevices(): Promise<MediaDeviceInfo[]> {
    try {
      return await BrowserMultiFormatReader.listVideoInputDevices();
    } catch (error) {
      console.error('Error listing camera devices:', error);
      return [];
    }
  }

  /**
   * Parse boarding pass data from raw barcode string
   * (useful for testing without camera)
   * @param rawData - Raw barcode data
   */
  parseBoardingPass(rawData: string): BoardingPassData | null {
    return BCBPParser.parse(rawData);
  }
}

// Export singleton instance
export const barcodeScannerService = new BarcodeScannerService();

// Export parser for testing
export { BCBPParser };
