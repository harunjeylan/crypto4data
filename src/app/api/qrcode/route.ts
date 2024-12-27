import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log({ body });
        const { hash, code, data } = body;


        if (!hash) {
            return NextResponse.json(
                { error: 'Hash is required' },
                { status: 400 }
            );
        }

        // Generate QR Code as a Data URL
        const qrCodeDataURL = await QRCode.toDataURL(`${data}:${code}:${hash}`);

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
