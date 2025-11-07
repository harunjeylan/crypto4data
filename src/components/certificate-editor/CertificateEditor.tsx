'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CertificateTemplate, GeneratedCertificate, TextField } from '@/types/template';
import { ChevronLeft, ChevronRight, Download, FileDown, Archive, ArrowLeft, QrCode, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import JSZip from 'jszip';
import jsPDF from 'jspdf';

// Utility function to transform text case
const transformTextCase = (text: string, textCase?: 'uppercase' | 'lowercase' | 'titlecase' | 'none'): string => {
    if (!textCase || textCase === 'none') return text;
    switch (textCase) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'titlecase':
            return text.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        default:
            return text;
    }
};

// Helper function to get display name from certificate data
const getDisplayName = (cert: GeneratedCertificate, template: CertificateTemplate): string => {
    // Try to get first field value, or fallback to name
    if (cert.data.fieldValues && template.textFields.length > 0) {
        const firstField = template.textFields[0];
        const firstValue = cert.data.fieldValues[firstField.id];
        if (firstValue) return firstValue;
    }
    return cert.data.name || 'Untitled';
};

interface CertificateEditorProps {
    certificates: GeneratedCertificate[];
    template: CertificateTemplate;
    onBack: () => void;
    onUpdateCertificates: (certs: GeneratedCertificate[]) => void;
}

export default function CertificateEditor({
    certificates,
    template,
    onBack,
    onUpdateCertificates,
}: CertificateEditorProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [exportProgress, setExportProgress] = useState<{ progress: number; isExporting: boolean; type?: 'PDF' | 'ZIP' }>({
        progress: 0,
        isExporting: false,
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const qrImageRef = useRef<{ [key: string]: HTMLImageElement }>({});

    const currentCert = certificates[currentIndex];

    // Load background image once
    useEffect(() => {
        if (template?.imageData) {
            const img = new Image();
            img.onload = () => {
                bgImageRef.current = img;
                drawCanvas();
            };
            img.src = template.imageData;
        }
    }, [template?.imageData]);

    // Load QR code images for all certificates
    useEffect(() => {
        certificates.forEach((cert) => {
            if (cert.data.qrCodeDataURL && !qrImageRef.current[cert.id]) {
                const img = new Image();
                img.onload = () => {
                    qrImageRef.current[cert.id] = img;
                    if (currentCert?.id === cert.id) {
                        drawCanvas();
                    }
                };
                img.src = cert.data.qrCodeDataURL;
            }
        });
    }, [certificates, currentCert?.id]);

    // Draw canvas function - synchronous and smooth
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !template || !currentCert) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = template.width;
        canvas.height = template.height;

        // Draw background image (cached)
        if (bgImageRef.current) {
            ctx.drawImage(bgImageRef.current, 0, 0, template.width, template.height);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, template.width, template.height);
        }

        // Draw text fields with adjustments
        template.textFields.forEach((field) => {
            const adjustments = currentCert.adjustments?.[field.id] || {};
            const fontSize = adjustments.fontSize ?? field.fontSize;
            const x = adjustments.x ?? field.x;
            const y = adjustments.y ?? field.y;
            const textCase = adjustments.textCase ?? field.textCase ?? 'none';
            const width = adjustments.width ?? field.width;
            const alignment = adjustments.alignment ?? field.alignment;
            const color = adjustments.color ?? field.color;

            ctx.font = `${fontSize}px ${field.fontFamily}`;
            ctx.textAlign = alignment;
            ctx.textBaseline = 'top';

            // Get field-specific value or fallback to name for backward compatibility
            let text = currentCert.data.fieldValues?.[field.id] || currentCert.data.name || '';
            text = transformTextCase(text, textCase);

            // Handle text width constraint
            let displayText = text;
            if (width && width > 0) {
                const metrics = ctx.measureText(text);
                if (metrics.width > width) {
                    // Truncate text to fit width
                    let truncated = '';
                    for (let i = 0; i < text.length; i++) {
                        const testText = truncated + text[i] + '...';
                        const testMetrics = ctx.measureText(testText);
                        if (testMetrics.width > width) {
                            break;
                        }
                        truncated += text[i];
                    }
                    displayText = truncated + '...';
                }
            }

            const metrics = ctx.measureText(displayText);

            // Calculate box dimensions based on alignment
            let boxX = x;
            let boxWidth = width && width > 0 ? width : metrics.width;

            if (alignment === 'center') {
                boxX = x - boxWidth / 2;
            } else if (alignment === 'right') {
                boxX = x - boxWidth;
            }

            // Draw semi-transparent background
            ctx.fillStyle = selectedField === field.id
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(boxX - 8, y - 8, boxWidth + 16, fontSize + 16);

            // Draw border
            ctx.strokeStyle = selectedField === field.id ? '#3b82f6' : '#6b7280';
            ctx.lineWidth = selectedField === field.id ? 3 : 2;
            ctx.setLineDash(selectedField === field.id ? [5, 5] : [3, 3]);
            ctx.strokeRect(boxX - 8, y - 8, boxWidth + 16, fontSize + 16);
            ctx.setLineDash([]);

            // Draw text
            ctx.fillStyle = color;
            ctx.fillText(displayText, x, y);
        });

        // Draw QR code with adjustments (cached)
        if (template.qrCodeField && currentCert.data.qrCodeDataURL) {
            const qrAdjustments = currentCert.adjustments?.qrCode || {};
            const qrX = qrAdjustments.x ?? template.qrCodeField.x;
            const qrY = qrAdjustments.y ?? template.qrCodeField.y;
            const qrSize = qrAdjustments.size ?? template.qrCodeField.size;

            const qrImg = qrImageRef.current[currentCert.id];
            if (qrImg) {
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            } else {
                // Draw placeholder if QR image not loaded yet
                ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
                ctx.fillRect(qrX, qrY, qrSize, qrSize);
            }

            // Draw semi-transparent background
            ctx.fillStyle = selectedField === 'qrCode'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(16, 185, 129, 0.1)';
            ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

            // Draw border
            ctx.strokeStyle = selectedField === 'qrCode' ? '#10b981' : '#059669';
            ctx.lineWidth = selectedField === 'qrCode' ? 3 : 2;
            ctx.setLineDash(selectedField === 'qrCode' ? [5, 5] : [3, 3]);
            ctx.strokeRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
            ctx.setLineDash([]);
        }
    }, [template, currentCert, selectedField]);

    // Re-render canvas when data changes
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas, currentIndex, currentCert?.data.name, currentCert?.adjustments]);

    // Clear selection when switching certificates
    useEffect(() => {
        setSelectedField(null);
    }, [currentIndex]);

    // Update field adjustment
    const updateFieldAdjustment = useCallback((fieldId: string, updates: {
        fontSize?: number;
        x?: number;
        y?: number;
        textCase?: 'uppercase' | 'lowercase' | 'titlecase' | 'none';
        width?: number;
        alignment?: 'left' | 'center' | 'right';
        color?: string;
    }) => {
        const updated = certificates.map((cert) => {
            if (cert.id === currentCert.id) {
                return {
                    ...cert,
                    adjustments: {
                        ...cert.adjustments,
                        [fieldId]: {
                            ...cert.adjustments?.[fieldId],
                            ...updates,
                        },
                    },
                };
            }
            return cert;
        });
        onUpdateCertificates(updated);
    }, [certificates, currentCert?.id, onUpdateCertificates]);

    // Apply current certificate adjustments to all certificates
    const applyAdjustmentsToAll = useCallback(() => {
        if (!currentCert?.adjustments) return;

        if (!confirm('Apply current certificate\'s adjustments to all other certificates?')) {
            return;
        }

        const updated = certificates.map((cert) => {
            if (cert.id === currentCert.id) {
                return cert; // Skip current certificate
            }
            return {
                ...cert,
                adjustments: {
                    ...cert.adjustments,
                    ...currentCert.adjustments,
                },
            };
        });
        onUpdateCertificates(updated);
    }, [certificates, currentCert, onUpdateCertificates]);

    // Update QR code adjustment
    const updateQRCodeAdjustment = useCallback((updates: { size?: number; x?: number; y?: number }) => {
        const updated = certificates.map((cert) => {
            if (cert.id === currentCert.id) {
                return {
                    ...cert,
                    adjustments: {
                        ...cert.adjustments,
                        qrCode: {
                            ...cert.adjustments?.qrCode,
                            ...updates,
                        },
                    },
                };
            }
            return cert;
        });
        onUpdateCertificates(updated);
    }, [certificates, currentCert?.id, onUpdateCertificates]);

    // Update field value
    const updateFieldValue = useCallback((fieldId: string, value: string) => {
        const updated = certificates.map((cert) => {
            if (cert.id === currentCert.id) {
                return {
                    ...cert,
                    data: {
                        ...cert.data,
                        fieldValues: {
                            ...cert.data.fieldValues,
                            [fieldId]: value,
                        },
                        // Also update name for backward compatibility (use first field or name)
                        name: value || cert.data.name || '',
                    },
                };
            }
            return cert;
        });
        onUpdateCertificates(updated);
    }, [certificates, currentCert?.id, onUpdateCertificates]);

    // Canvas click handler
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !template || !currentCert) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        let clickedField: string | null = null;

        // Check text fields
        for (const field of template.textFields) {
            const adjustments = currentCert.adjustments?.[field.id] || {};
            const fieldX = adjustments.x ?? field.x;
            const fieldY = adjustments.y ?? field.y;
            const fontSize = adjustments.fontSize ?? field.fontSize;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.font = `${fontSize}px ${field.fontFamily}`;
                const text = currentCert.data.fieldValues?.[field.id] || currentCert.data.name || '';
                const metrics = ctx.measureText(text);

                let boxX = fieldX;
                let boxWidth = metrics.width;

                if (field.alignment === 'center') {
                    boxX = fieldX - metrics.width / 2;
                } else if (field.alignment === 'right') {
                    boxX = fieldX - metrics.width;
                }

                if (
                    x >= boxX - 8 &&
                    x <= boxX + boxWidth + 8 &&
                    y >= fieldY - 8 &&
                    y <= fieldY + fontSize + 8
                ) {
                    clickedField = field.id;
                    break;
                }
            }
        }

        // Check QR code field
        if (template.qrCodeField && !clickedField) {
            const qrAdjustments = currentCert.adjustments?.qrCode || {};
            const qrX = qrAdjustments.x ?? template.qrCodeField.x;
            const qrY = qrAdjustments.y ?? template.qrCodeField.y;
            const qrSize = qrAdjustments.size ?? template.qrCodeField.size;

            if (
                x >= qrX - 5 &&
                x <= qrX + qrSize + 5 &&
                y >= qrY - 5 &&
                y <= qrY + qrSize + 5
            ) {
                clickedField = 'qrCode';
            }
        }

        setSelectedField(clickedField);
    };

    // Canvas mouse down handler
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !template || !currentCert || !selectedField) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (selectedField === 'qrCode') {
            const qrAdjustments = currentCert.adjustments?.qrCode || {};
            const qrX = qrAdjustments.x ?? template.qrCodeField!.x;
            const qrY = qrAdjustments.y ?? template.qrCodeField!.y;
            setDragOffset({ x: x - qrX, y: y - qrY });
            setIsDragging(true);
        } else {
            const field = template.textFields.find(f => f.id === selectedField);
            if (field) {
                const adjustments = currentCert.adjustments?.[field.id] || {};
                const fieldX = adjustments.x ?? field.x;
                const fieldY = adjustments.y ?? field.y;
                setDragOffset({ x: x - fieldX, y: y - fieldY });
                setIsDragging(true);
            }
        }
    };

    // Canvas mouse move handler
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !template || !currentCert) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (isDragging && selectedField) {
            if (selectedField === 'qrCode') {
                updateQRCodeAdjustment({ x: x - dragOffset.x, y: y - dragOffset.y });
            } else {
                updateFieldAdjustment(selectedField, { x: x - dragOffset.x, y: y - dragOffset.y });
            }
        } else {
            // Update cursor on hover
            let hoveredField: string | null = null;

            // Check text fields
            for (const field of template.textFields) {
                const adjustments = currentCert.adjustments?.[field.id] || {};
                const fieldX = adjustments.x ?? field.x;
                const fieldY = adjustments.y ?? field.y;
                const fontSize = adjustments.fontSize ?? field.fontSize;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.font = `${fontSize}px ${field.fontFamily}`;
                    const text = currentCert.data.fieldValues?.[field.id] || currentCert.data.name || '';
                    const metrics = ctx.measureText(text);

                    let boxX = fieldX;
                    let boxWidth = metrics.width;

                    if (field.alignment === 'center') {
                        boxX = fieldX - metrics.width / 2;
                    } else if (field.alignment === 'right') {
                        boxX = fieldX - metrics.width;
                    }

                    if (
                        x >= boxX - 8 &&
                        x <= boxX + boxWidth + 8 &&
                        y >= fieldY - 8 &&
                        y <= fieldY + fontSize + 8
                    ) {
                        hoveredField = field.id;
                        break;
                    }
                }
            }

            // Check QR code field
            if (template.qrCodeField && !hoveredField) {
                const qrAdjustments = currentCert.adjustments?.qrCode || {};
                const qrX = qrAdjustments.x ?? template.qrCodeField.x;
                const qrY = qrAdjustments.y ?? template.qrCodeField.y;
                const qrSize = qrAdjustments.size ?? template.qrCodeField.size;

                if (
                    x >= qrX - 5 &&
                    x <= qrX + qrSize + 5 &&
                    y >= qrY - 5 &&
                    y <= qrY + qrSize + 5
                ) {
                    hoveredField = 'qrCode';
                }
            }

            if (hoveredField) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        }
    };

    // Canvas mouse up handler
    const handleCanvasMouseUp = () => {
        setIsDragging(false);
    };

    // Render certificate image for export
    const renderCertificateImage = async (cert: GeneratedCertificate): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = template.width;
            canvas.height = template.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Load QR code image if needed
            const loadQRCode = (): Promise<HTMLImageElement | null> => {
                return new Promise((resolveQR) => {
                    if (!template.qrCodeField || !cert.data.qrCodeDataURL) {
                        resolveQR(null);
                        return;
                    }

                    // Check if already loaded
                    const existingImg = qrImageRef.current[cert.id];
                    if (existingImg && existingImg.complete) {
                        resolveQR(existingImg);
                        return;
                    }

                    // Load the image
                    const img = new Image();
                    img.onload = () => {
                        qrImageRef.current[cert.id] = img;
                        resolveQR(img);
                    };
                    img.onerror = () => {
                        console.warn('Failed to load QR code image for certificate:', cert.id);
                        resolveQR(null);
                    };
                    img.src = cert.data.qrCodeDataURL;
                });
            };

            // Load background image if needed
            const loadBackground = (): Promise<HTMLImageElement | null> => {
                return new Promise((resolveBG) => {
                    if (!template.imageData) {
                        resolveBG(null);
                        return;
                    }

                    if (bgImageRef.current && bgImageRef.current.complete) {
                        resolveBG(bgImageRef.current);
                        return;
                    }

                    const img = new Image();
                    img.onload = () => {
                        bgImageRef.current = img;
                        resolveBG(img);
                    };
                    img.onerror = () => {
                        console.warn('Failed to load background image');
                        resolveBG(null);
                    };
                    img.src = template.imageData;
                });
            };

            // Load all images, then render
            Promise.all([loadBackground(), loadQRCode()])
                .then(([bgImg, qrImg]) => {
                    // Draw background
                    if (bgImg) {
                        ctx.drawImage(bgImg, 0, 0, template.width, template.height);
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, template.width, template.height);
                    }

                    // Draw text fields
                    template.textFields.forEach((field) => {
                        const adjustments = cert.adjustments?.[field.id] || {};
                        const fontSize = adjustments.fontSize ?? field.fontSize;
                        const x = adjustments.x ?? field.x;
                        const y = adjustments.y ?? field.y;
                        const textCase = adjustments.textCase ?? field.textCase ?? 'none';
                        const width = adjustments.width ?? field.width;
                        const alignment = adjustments.alignment ?? field.alignment;
                        const color = adjustments.color ?? field.color;

                        ctx.font = `${fontSize}px ${field.fontFamily}`;
                        ctx.textAlign = alignment;
                        ctx.textBaseline = 'top';

                        // Get field-specific value or fallback to name for backward compatibility
                        let text = cert.data.fieldValues?.[field.id] || cert.data.name || '';
                        text = transformTextCase(text, textCase);

                        // Handle text width constraint
                        let displayText = text;
                        if (width && width > 0) {
                            const metrics = ctx.measureText(text);
                            if (metrics.width > width) {
                                // Truncate text to fit width
                                let truncated = '';
                                for (let i = 0; i < text.length; i++) {
                                    const testText = truncated + text[i] + '...';
                                    const testMetrics = ctx.measureText(testText);
                                    if (testMetrics.width > width) {
                                        break;
                                    }
                                    truncated += text[i];
                                }
                                displayText = truncated + '...';
                            }
                        }

                        ctx.fillStyle = color;
                        ctx.fillText(displayText, x, y);
                    });

                    // Draw QR code
                    if (template.qrCodeField && qrImg) {
                        const qrAdjustments = cert.adjustments?.qrCode || {};
                        const qrX = qrAdjustments.x ?? template.qrCodeField.x;
                        const qrY = qrAdjustments.y ?? template.qrCodeField.y;
                        const qrSize = qrAdjustments.size ?? template.qrCodeField.size;

                        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                    }

                    resolve(canvas.toDataURL('image/png'));
                })
                .catch((error) => {
                    console.error('Error rendering certificate image:', error);
                    reject(error);
                });
        });
    };

    // Export PDF
    const handleExportPDF = async () => {
        setExportProgress({ progress: 0, isExporting: true, type: 'PDF' });

        try {
            const PX_TO_MM = 25.4 / 96;
            const pdfWidth = template.width * PX_TO_MM;
            const pdfHeight = template.height * PX_TO_MM;
            const aspectRatio = template.width / template.height;

            const pdf = new jsPDF({
                orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight],
            });

            const total = certificates.length;
            for (let i = 0; i < certificates.length; i++) {
                const cert = certificates[i];
                const imgData = await renderCertificateImage(cert);

                if (imgData) {
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                }

                // Update progress
                const progress = Math.round(((i + 1) / total) * 100);
                setExportProgress({ progress, isExporting: true, type: 'PDF' });
            }

            pdf.save('certificates.pdf');
            setExportProgress({ progress: 100, isExporting: false });

            // Hide progress bar after a short delay
            setTimeout(() => {
                setExportProgress({ progress: 0, isExporting: false });
            }, 500);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setExportProgress({ progress: 0, isExporting: false });
        }
    };

    // Export ZIP
    const handleExportZIP = async () => {
        setExportProgress({ progress: 0, isExporting: true, type: 'ZIP' });

        try {
            const zip = new JSZip();
            const total = certificates.length;

            for (let i = 0; i < certificates.length; i++) {
                const cert = certificates[i];
                const imgData = await renderCertificateImage(cert);

                if (imgData) {
                    const base64Data = imgData.split(',')[1];
                    const displayName = getDisplayName(cert, template);
                    const fileName = `${displayName.replace(/[^a-z0-9]/gi, '_')}.png`;
                    zip.file(fileName, base64Data, { base64: true });
                }

                // Update progress
                const progress = Math.round(((i + 1) / total) * 90); // Reserve 10% for zip generation
                setExportProgress({ progress, isExporting: true, type: 'ZIP' });
            }

            setExportProgress({ progress: 95, isExporting: true, type: 'ZIP' });
            const content = await zip.generateAsync({ type: 'blob' });

            setExportProgress({ progress: 100, isExporting: true, type: 'ZIP' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'certificates.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            setExportProgress({ progress: 100, isExporting: false });

            // Hide progress bar after a short delay
            setTimeout(() => {
                setExportProgress({ progress: 0, isExporting: false });
            }, 500);
        } catch (error) {
            console.error('Error exporting ZIP:', error);
            setExportProgress({ progress: 0, isExporting: false });
        }
    };

    // Generate thumbnails
    const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        const loadThumbnails = async () => {
            const thumbMap: { [key: number]: string } = {};
            for (let i = 0; i < certificates.length; i++) {
                const thumb = await renderCertificateImage(certificates[i]);
                thumbMap[i] = thumb;
            }
            setThumbnails(thumbMap);
        };
        if (certificates.length > 0 && template) {
            loadThumbnails();
        }
    }, [certificates.length, template?.id]);

    if (!currentCert) {
        return (
            <div className="space-y-6 py-4">
                <Card>
                    <CardContent className="pt-6">
                        <p>No certificates to edit.</p>
                        <Button onClick={onBack} className="mt-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getFieldAdjustments = (fieldId: string) => {
        return currentCert.adjustments?.[fieldId] || {};
    };

    const getQRCodeAdjustments = () => {
        return currentCert.adjustments?.qrCode || {};
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b bg-card px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Certificate Editor</CardTitle>
                        <CardDescription>
                            Adjust font size and position for each certificate before export
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Export PDF
                        </Button>
                        <Button variant="outline" onClick={handleExportZIP}>
                            <Archive className="h-4 w-4 mr-2" />
                            Export ZIP
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto bg-gray-100 p-4">
                        <div className="flex items-center justify-center min-h-full">
                            <div className="bg-white shadow-lg rounded-lg p-4 inline-block">
                                <canvas
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                    className="border-2 border-gray-300 cursor-crosshair shadow-md"
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Certificate Thumbnails - Horizontal Scroll */}
                    <div className="flex-shrink-0 border-t bg-card p-4">
                        <div className="mb-2">
                            <p className="text-sm font-semibold">
                                All Certificates ({certificates.length})
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <div className="flex gap-4 pb-2">
                                {certificates.map((cert, index) => (
                                    <div
                                        key={cert.id}
                                        className={`flex-shrink-0 cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${currentIndex === index
                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => setCurrentIndex(index)}
                                    >
                                        <div className="w-32 h-20 bg-white flex items-center justify-center">
                                            {thumbnails[index] ? (
                                                <img
                                                    src={thumbnails[index]}
                                                    alt={`Certificate ${index + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="text-xs text-muted-foreground">Loading...</div>
                                            )}
                                        </div>
                                        <div className="p-2 bg-muted text-center">
                                            <p className="text-xs font-medium truncate">{getDisplayName(cert, template)}</p>
                                            <p className="text-xs text-muted-foreground">#{index + 1}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Field Editor */}
                <div className="w-96 border-l bg-card overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Fields Editor</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{currentIndex + 1} / {certificates.length}</span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                        disabled={currentIndex === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setCurrentIndex(Math.min(certificates.length - 1, currentIndex + 1))}
                                        disabled={currentIndex === certificates.length - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {template.textFields.map((field) => {
                            const adjustments = getFieldAdjustments(field.id);
                            const fontSize = adjustments.fontSize ?? field.fontSize;
                            const x = adjustments.x ?? field.x;
                            const y = adjustments.y ?? field.y;
                            const textCase = adjustments.textCase ?? field.textCase ?? 'none';
                            const width = adjustments.width ?? field.width;
                            const alignment = adjustments.alignment ?? field.alignment;
                            const color = adjustments.color ?? field.color;

                            return (
                                <Card
                                    key={field.id}
                                    className={`cursor-pointer transition-all ${selectedField === field.id
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                        : 'border-gray-200'
                                        }`}
                                    onClick={() => setSelectedField(field.id)}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-sm">
                                            {field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1) + ' Field'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">{field.label || 'Field Value'}</Label>
                                            <Input
                                                type="text"
                                                value={currentCert.data.fieldValues?.[field.id] || currentCert.data.name || ''}
                                                onChange={(e) => updateFieldValue(field.id, e.target.value)}
                                                className="h-8 text-sm"
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder={`Enter ${field.label || 'value'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Font Size: {fontSize}px</Label>
                                                <Input
                                                    type="number"
                                                    value={fontSize}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 8 && val <= 72) {
                                                            updateFieldAdjustment(field.id, { fontSize: val });
                                                        }
                                                    }}
                                                    className="h-7 w-16 text-xs"
                                                    min={8}
                                                    max={72}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[fontSize]}
                                                onValueChange={([value]) => updateFieldAdjustment(field.id, { fontSize: value })}
                                                min={8}
                                                max={72}
                                                step={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">X Position: {Math.round(x)}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(x)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 0 && val <= template.width) {
                                                            updateFieldAdjustment(field.id, { x: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={0}
                                                    max={template.width}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[x]}
                                                onValueChange={([value]) => updateFieldAdjustment(field.id, { x: value })}
                                                min={0}
                                                max={template.width}
                                                step={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Y Position: {Math.round(y)}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(y)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 0 && val <= template.height) {
                                                            updateFieldAdjustment(field.id, { y: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={0}
                                                    max={template.height}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[y]}
                                                onValueChange={([value]) => updateFieldAdjustment(field.id, { y: value })}
                                                min={0}
                                                max={template.height}
                                                step={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Text Case</Label>
                                            <div className="flex gap-1">
                                                {(['none', 'uppercase', 'lowercase', 'titlecase'] as const).map((caseType) => (
                                                    <Button
                                                        key={caseType}
                                                        variant={textCase === caseType ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="flex-1 h-7 text-xs capitalize"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateFieldAdjustment(field.id, { textCase: caseType });
                                                        }}
                                                    >
                                                        {caseType === 'none' ? 'None' : caseType}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Text Width: {width ? Math.round(width) + 'px' : 'Auto'}</Label>
                                                <Input
                                                    type="number"
                                                    value={width || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                        if (val === undefined || (val >= 50 && val <= template.width)) {
                                                            updateFieldAdjustment(field.id, { width: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={50}
                                                    max={template.width}
                                                    placeholder="Auto"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={width ? [width] : [template.width]}
                                                onValueChange={([value]) => updateFieldAdjustment(field.id, { width: value })}
                                                min={50}
                                                max={template.width}
                                                step={10}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Text Alignment</Label>
                                            <div className="flex gap-1">
                                                {(['left', 'center', 'right'] as const).map((align) => (
                                                    <Button
                                                        key={align}
                                                        variant={alignment === align ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="flex-1 h-7 text-xs capitalize"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateFieldAdjustment(field.id, { alignment: align });
                                                        }}
                                                    >
                                                        {align}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Text Color</Label>
                                            <Input
                                                type="color"
                                                value={color}
                                                onChange={(e) => {
                                                    updateFieldAdjustment(field.id, { color: e.target.value });
                                                }}
                                                className="h-8 w-full"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {/* Apply For All Button */}
                        {certificates.length > 1 && (
                            <Card>
                                <CardContent className="pt-6">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={applyAdjustmentsToAll}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Apply For All
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                        Copy current certificate's adjustments to all others
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* QR Code Field Editor */}
                        {template.qrCodeField && (
                            <Card
                                className={`cursor-pointer transition-all ${selectedField === 'qrCode'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                    : 'border-gray-200'
                                    }`}
                                onClick={() => setSelectedField('qrCode')}
                            >
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <QrCode className="h-4 w-4" />
                                        QR Code Field
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Size: {Math.round((getQRCodeAdjustments().size ?? template.qrCodeField.size))}px</Label>
                                            <Input
                                                type="number"
                                                value={Math.round(getQRCodeAdjustments().size ?? template.qrCodeField.size)}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 50 && val <= 800) {
                                                        updateQRCodeAdjustment({ size: val });
                                                    }
                                                }}
                                                className="h-7 w-20 text-xs"
                                                min={50}
                                                max={800}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <Slider
                                            value={[getQRCodeAdjustments().size ?? template.qrCodeField.size]}
                                            onValueChange={([value]) => updateQRCodeAdjustment({ size: value })}
                                            min={50}
                                            max={800}
                                            step={5}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">X Position: {Math.round((getQRCodeAdjustments().x ?? template.qrCodeField.x))}</Label>
                                            <Input
                                                type="number"
                                                value={Math.round(getQRCodeAdjustments().x ?? template.qrCodeField.x)}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 0 && val <= template.width) {
                                                        updateQRCodeAdjustment({ x: val });
                                                    }
                                                }}
                                                className="h-7 w-20 text-xs"
                                                min={0}
                                                max={template.width}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <Slider
                                            value={[getQRCodeAdjustments().x ?? template.qrCodeField.x]}
                                            onValueChange={([value]) => updateQRCodeAdjustment({ x: value })}
                                            min={0}
                                            max={template.width}
                                            step={1}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Y Position: {Math.round((getQRCodeAdjustments().y ?? template.qrCodeField.y))}</Label>
                                            <Input
                                                type="number"
                                                value={Math.round(getQRCodeAdjustments().y ?? template.qrCodeField.y)}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 0 && val <= template.height) {
                                                        updateQRCodeAdjustment({ y: val });
                                                    }
                                                }}
                                                className="h-7 w-20 text-xs"
                                                min={0}
                                                max={template.height}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <Slider
                                            value={[getQRCodeAdjustments().y ?? template.qrCodeField.y]}
                                            onValueChange={([value]) => updateQRCodeAdjustment({ y: value })}
                                            min={0}
                                            max={template.height}
                                            step={1}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Progress Bar */}
            {exportProgress.isExporting && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-96 max-w-[calc(100vw-2rem)]">
                    <Card className="shadow-2xl border-2">
                        <CardContent className="pt-6 pb-4 px-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                    <span className="text-sm font-semibold">
                                        Exporting {exportProgress.type}...
                                    </span>
                                </div>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {exportProgress.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${exportProgress.progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
