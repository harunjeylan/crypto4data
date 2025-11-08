import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            body = await req.json();
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        // Extract data from request body
        const imageDataUrls = body.imageDataUrls || body.images || body.imageUrls || body.image_data_urls;
        const template = body.template;

        // Better validation with detailed error messages
        if (!template) {
            return NextResponse.json(
                { error: 'Template is required' },
                { status: 400 }
            );
        }

        if (!template.width || !template.height) {
            return NextResponse.json(
                { error: 'Template width and height are required' },
                { status: 400 }
            );
        }

        if (!imageDataUrls) {
            return NextResponse.json(
                { error: 'Image data URLs array is required' },
                { status: 400 }
            );
        }

        if (!Array.isArray(imageDataUrls)) {
            return NextResponse.json(
                { error: 'Image data URLs must be an array' },
                { status: 400 }
            );
        }

        if (imageDataUrls.length === 0) {
            return NextResponse.json(
                { error: 'At least one image data URL is required' },
                { status: 400 }
            );
        }

        // Calculate PDF dimensions
        const PX_TO_MM = 25.4 / 96;
        const pdfWidth = template.width * PX_TO_MM;
        const pdfHeight = template.height * PX_TO_MM;
        const aspectRatio = template.width / template.height;

        // Create PDF
        const pdf = new jsPDF({
            orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight],
        });

        // Add each certificate image to PDF
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < imageDataUrls.length; i++) {
            try {
                const imgDataUrl = imageDataUrls[i];

                if (!imgDataUrl) {
                    errorCount++;
                    continue;
                }

                // Extract base64 data from data URL
                let base64Image: string;
                if (imgDataUrl.startsWith('data:image')) {
                    const base64Match = imgDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
                    if (base64Match && base64Match[1]) {
                        base64Image = base64Match[1];
                    } else {
                        // Fallback: try splitting by comma
                        base64Image = imgDataUrl.split(',')[1] || imgDataUrl;
                    }
                } else {
                    base64Image = imgDataUrl;
                }

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(base64Image, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                successCount++;
            } catch (imgError) {
                console.error(`Error adding image ${i + 1} to PDF:`, imgError);
                errorCount++;
                // Continue with next image
            }
        }

        if (successCount === 0) {
            return NextResponse.json(
                { error: 'Failed to add any images to PDF' },
                { status: 500 }
            );
        }

        // Get PDF as array buffer and convert to Uint8Array
        const pdfArrayBuffer = pdf.output('arraybuffer');
        const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

        // Return PDF as response
        return new NextResponse(pdfUint8Array, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="certificates.pdf"',
            },
        });
    } catch (error) {
        console.error('Error exporting PDF:', error);
        return NextResponse.json(
            { error: `Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}

