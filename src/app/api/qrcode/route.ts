import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log({ body });
        const { signatureData } = body;


        if (!signatureData) {
            return NextResponse.json(
                { error: 'Hash is required' },
                { status: 400 }
            );
        }

        // Generate QR Code as a Data URL
        const qrCodeDataURL = await QRCode.toDataURL(signatureData);

        const [data, code, signature] = signatureData.split(":")
        // Return the QR code data and download details
        return NextResponse.json({
            qrCodeDataURL,
            fileName: `${data}-${code}.png`,
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        return NextResponse.json(
            { error: 'Failed to generate QR code' },
            { status: 500 }
        );
    }
}
