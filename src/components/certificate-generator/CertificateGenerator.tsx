'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CertificateTemplate, CertificateData, GeneratedCertificate } from '@/types/template';
import { getCurrentTemplate } from '@/lib/template-storage';
import { generateSignature } from '@/action';
import Papa from 'papaparse';
import { ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, QrCode, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import CertificateEditor from '@/components/certificate-editor/CertificateEditor';
import Link from 'next/link';

function generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code;
}

export default function CertificateGenerator() {
    const [template, setTemplate] = useState<CertificateTemplate | null>(null);
    const [certificates, setCertificates] = useState<GeneratedCertificate[]>([]);
    const [privateKey, setPrivateKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'generating' | 'editing'>('upload');
    const [generationProgress, setGenerationProgress] = useState<{ progress: number; isGenerating: boolean }>({
        progress: 0,
        isGenerating: false,
    });

    useEffect(() => {
        const currentTemplate = getCurrentTemplate();
        if (currentTemplate) {
            setTemplate(currentTemplate);
        }
    }, []);

    const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            Papa.parse(e.target.files[0], {
                complete: (results: any) => {
                    if (!template) return;

                    // Map CSV columns to field labels
                    const csvHeaders = results.meta.fields || [];
                    const fieldLabelMap: { [label: string]: string } = {};

                    // Create a map of field labels to field IDs
                    template.textFields.forEach((field) => {
                        if (field.label) {
                            fieldLabelMap[field.label.toLowerCase()] = field.id;
                        }
                    });

                    const parsedData: CertificateData[] = results.data
                        .filter((row: any) => {
                            // Check if at least one field has a value
                            return csvHeaders.some((header: string) => {
                                const fieldId = fieldLabelMap[header.toLowerCase()];
                                return fieldId && row[header];
                            }) || row.name; // Fallback to name column
                        })
                        .map((row: any) => {
                            const fieldValues: { [fieldId: string]: string } = {};
                            let nameValue = '';

                            // Map CSV columns to field values
                            csvHeaders.forEach((header: string) => {
                                const fieldId = fieldLabelMap[header.toLowerCase()];
                                if (fieldId && row[header]) {
                                    fieldValues[fieldId] = row[header];
                                    // Use first field value as name for backward compatibility
                                    if (!nameValue) {
                                        nameValue = row[header];
                                    }
                                }
                            });

                            // Fallback to name column if no field matches
                            if (Object.keys(fieldValues).length === 0 && row.name) {
                                nameValue = row.name;
                                // If there's only one field, use it
                                if (template.textFields.length === 1) {
                                    fieldValues[template.textFields[0].id] = row.name;
                                }
                            }

                            return {
                                fieldValues,
                                name: nameValue,
                                certificateName: row.certificateName || row.certificate_name || undefined,
                                date: row.date || undefined,
                            };
                        });

                    // Convert to GeneratedCertificate format
                    const certs: GeneratedCertificate[] = parsedData.map((data) => ({
                        id: `cert-${Date.now()}-${Math.random()}`,
                        data,
                        templateId: template?.id || '',
                        adjustments: {},
                    }));

                    setCertificates(certs);
                },
                header: true,
            });
        }
    };

    const generateCertificates = async () => {
        if (!template || !privateKey || certificates.length === 0) {
            alert('Template, Private Key, and CSV Data are required!');
            return;
        }

        setLoading(true);
        setStep('generating');
        setGenerationProgress({ progress: 0, isGenerating: true });

        const total = certificates.length;
        const updatedCertificates: GeneratedCertificate[] = [];

        // Process certificates one by one to show progress
        for (let i = 0; i < certificates.length; i++) {
            const cert = certificates[i];
            try {
                const code = generateUniqueCode();
                // Use first field value or name for signature
                const displayName = cert.data.fieldValues && template.textFields.length > 0
                    ? (cert.data.fieldValues[template.textFields[0].id] || cert.data.name || '')
                    : (cert.data.name || '');
                const certificateName = cert.data.certificateName || template.name || 'Certificate';
                const date = cert.data.date || new Date().toISOString().split('T')[0]; // Default to today's date in YYYY-MM-DD format
                const signatureData = `${displayName}:${code}:${certificateName}:${date}`;
                const shortHash = await generateSignature(signatureData, privateKey);
                const fullSignatureData = `${signatureData}:${shortHash}`;

                // Generate QR code
                const response = await fetch('/api/qrcode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signatureData: fullSignatureData }),
                });

                let qrCodeDataURL = '';
                if (response.ok) {
                    const { qrCodeDataURL: qr } = await response.json();
                    qrCodeDataURL = qr;
                }

                // Generate certificate image
                const imageDataURL = await renderCertificate(template, cert.data, qrCodeDataURL);

                updatedCertificates.push({
                    ...cert,
                    data: {
                        ...cert.data,
                        signature: fullSignatureData,
                        qrCodeDataURL,
                    },
                    imageDataURL,
                });

                // Update progress
                const progress = Math.round(((i + 1) / total) * 100);
                setGenerationProgress({ progress, isGenerating: true });
            } catch (error) {
                console.error('Error processing certificate:', cert, error);
                updatedCertificates.push(cert);
            }
        }

        setCertificates(updatedCertificates);
        setLoading(false);
        setGenerationProgress({ progress: 100, isGenerating: false });
        setStep('editing');

        // Hide progress bar after a short delay
        setTimeout(() => {
            setGenerationProgress({ progress: 0, isGenerating: false });
        }, 500);
    };

    const renderCertificate = async (
        template: CertificateTemplate,
        data: CertificateData,
        qrCodeDataURL: string
    ): Promise<string> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = template.width;
            canvas.height = template.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve('');
                return;
            }

            // Load background image
            const bgImage = new Image();
            bgImage.onload = () => {
                // Draw background
                ctx.drawImage(bgImage, 0, 0, template.width, template.height);

                // Draw text fields
                template.textFields.forEach((field) => {
                    const fontWeight = field.fontWeight || 'normal';
                    const fontStyle = field.fontStyle || 'normal';
                    ctx.font = `${fontStyle} ${fontWeight} ${field.fontSize}px ${field.fontFamily}`;
                    ctx.fillStyle = field.color;
                    ctx.textAlign = field.alignment;
                    ctx.textBaseline = 'top';

                    // Get field-specific value or fallback to name
                    const text = data.fieldValues?.[field.id] || data.name || '';

                    ctx.fillText(text, field.x, field.y);
                });

                // Draw QR code
                if (template.qrCodeField && qrCodeDataURL) {
                    const qrImage = new Image();
                    qrImage.onload = () => {
                        ctx.drawImage(
                            qrImage,
                            template.qrCodeField!.x,
                            template.qrCodeField!.y,
                            template.qrCodeField!.size,
                            template.qrCodeField!.size
                        );
                        resolve(canvas.toDataURL('image/png'));
                    };
                    qrImage.src = qrCodeDataURL;
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            };
            bgImage.src = template.imageData;
        });
    };

    if (step === 'editing' && certificates.length > 0) {
        return (
            <CertificateEditor
                certificates={certificates}
                template={template!}
                onBack={() => setStep('upload')}
                onUpdateCertificates={setCertificates}
            />
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b bg-card px-6 py-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Certificate Generator</h2>
                    </div>
                    <Button variant="outline" size="sm" >
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="h-5 w-5" />
                                Certificate Generator
                            </CardTitle>
                            <CardDescription>
                                Generate certificates from your template using CSV data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!template && (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        No template found. Please create a template first in the{' '}
                                        <Link href="/template" className="underline font-medium">
                                            Template
                                        </Link>
                                        {' '}page.
                                    </p>
                                </div>
                            )}

                            {template && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="private-key-generate">Private Key</Label>
                                        <Textarea
                                            id="private-key-generate"
                                            onChange={(e) => setPrivateKey(e.target.value)}
                                            rows={4}
                                            className="font-mono text-sm"
                                            placeholder="Paste your private key here..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="csv-upload-generate" className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4" />
                                            Upload CSV File
                                        </Label>
                                        <Input
                                            type="file"
                                            id="csv-upload-generate"
                                            accept=".csv"
                                            onChange={handleCsvUpload}
                                        />
                                        {certificates.length > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                {certificates.length} entries loaded
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        <Button
                                            onClick={generateCertificates}
                                            disabled={loading || !privateKey || certificates.length === 0 || !template}
                                        >
                                            {loading && (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2"></div>
                                            )}
                                            <Upload className="h-4 w-4 mr-2" />
                                            {loading ? 'Generating...' : 'Generate Certificates'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Floating Progress Bar for Certificate Generation */}
            {generationProgress.isGenerating && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-96 max-w-[calc(100vw-2rem)]">
                    <Card className="shadow-2xl border-2">
                        <CardContent className="pt-6 pb-4 px-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                    <span className="text-sm font-semibold">
                                        Generating Certificates...
                                    </span>
                                </div>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {generationProgress.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${generationProgress.progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

