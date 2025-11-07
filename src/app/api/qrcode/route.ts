import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { signatureData } = body;

        if (!signatureData) {
            return NextResponse.json(
                { error: 'Hash is required' },
                { status: 400 }
            );
        }

        // Generate QR Code as a Data URL
        const qrCodeDataURL = await QRCode.toDataURL(signatureData);

        // Parse signature data - format: name:content:code:hash or name:code:hash
        const parts = signatureData.split(":");
        const name = parts[0] || 'certificate';
        const code = parts.length > 2 ? parts[parts.length - 2] : parts[1] || 'UNKNOWN';

        return NextResponse.json({
            qrCodeDataURL,
            fileName: `${name}-${code}.png`,
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        return NextResponse.json(
            { error: 'Failed to generate QR code' },
            { status: 500 }
        );
    }
}
