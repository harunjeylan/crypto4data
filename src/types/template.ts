export type FieldType = 'name';

export interface TextField {
  id: string;
  type: FieldType;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  textCase?: 'uppercase' | 'lowercase' | 'titlecase' | 'none';
  width?: number; // Text box width in pixels
  label?: string; // Field label (e.g., "English Name", "Arabic Name", "Name")
}

export interface QRCodeField {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  imageData: string; // Base64 image data
  width: number;
  height: number;
  textFields: TextField[];
  qrCodeField?: QRCodeField;
  createdAt: number;
}

export interface CertificateData {
  // Field-specific values: fieldId -> value
  fieldValues: { [fieldId: string]: string };
  // Legacy support: keep name for backward compatibility
  name?: string;
  certificateName?: string; // Certificate name for signature
  date?: string; // Certificate date for signature
  signature?: string;
  qrCodeDataURL?: string;
}

export interface GeneratedCertificate {
  id: string;
  data: CertificateData;
  templateId: string;
  adjustments?: {
    [fieldId: string]: {
      fontSize?: number;
      x?: number;
      y?: number;
      size?: number; // For QR code adjustments
      textCase?: 'uppercase' | 'lowercase' | 'titlecase' | 'none';
      width?: number;
      alignment?: 'left' | 'center' | 'right';
      color?: string;
    };
  };
  imageDataURL?: string;
}

