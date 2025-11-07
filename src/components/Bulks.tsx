'use client';

import { generateSignature } from '@/action';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { ChangeEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Download, QrCode, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type DataContent = {
    name: string;
    content: string; // Content field for QR code data
    signature?: string;
    qrCodeDataURL?: string;
    fileName?: string;
};

export default function Bulks() {
    const [data, setData] = useState<DataContent[]>([]);
    const [privateKey, setPrivateKey] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            Papa.parse(e.target.files[0], {
                complete: (results: any) => {
                    const parsedData: DataContent[] = results.data
                        .filter((row: any) => row.name && row.content)
                        .map((row: any) => ({
                            name: row.name,
                            content: row.content // Content is used for QR code data
                        }));
                    setData(parsedData);
                },
                header: true,
            });
        }
    };

    const handleGenerateSignatures = async () => {
        if (!privateKey || data.length === 0) {
            alert('Both Private Key and CSV Data are required!');
            return;
        }

        setLoading(true);
        const updatedData = await Promise.all(
            data.map(async (entry) => {
                try {
                    const code = generateUniqueCode();
                    // Signature includes name and content for QR code data
                    const shortHash = await generateSignature(`${entry.name}:${entry.content}:${code}`, privateKey);
                    // QR code data includes name, content, code, and signature
                    const signatureData = `${entry.name}:${entry.content}:${code}:${shortHash}`;

                    const response = await fetch('/api/qrcode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ signatureData }),
                    });

                    if (response.ok) {
                        const { qrCodeDataURL, fileName } = await response.json();
                        return { ...entry, signature: signatureData, qrCodeDataURL, fileName };
                    }
                } catch (error) {
                    console.error('Error processing entry:', entry, error);
                }
                return entry;
            })
        );
        setData(updatedData);
        setLoading(false);
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        data.forEach((entry) => {
            if (entry.qrCodeDataURL && entry.fileName) {
                const imgData = entry.qrCodeDataURL.split(',')[1];
                zip.file(entry.fileName, imgData, { base64: true });
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'qr_codes.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b bg-card px-6 py-4">
                <div className="flex items-center gap-4 mb-4">

                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Bulk Signature & QR Code Generator</h2>
                    </div>
                    <Button variant="outline" size="sm"  >
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="h-5 w-5" />
                                Bulk Signature & QR Code Generator
                            </CardTitle>
                            <CardDescription>
                                Upload a CSV file and generate signatures with QR codes for all entries
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="private-key-bulk">Private Key</Label>
                                <Textarea
                                    id="private-key-bulk"
                                    onChange={(e) => setPrivateKey(e.target.value)}
                                    rows={4}
                                    className="font-mono text-sm"
                                    placeholder="Paste your private key here..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor='csvUpload' className='flex items-center gap-2'>
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Upload CSV File
                                </Label>
                                <Input
                                    type='file'
                                    id='csvUpload'
                                    accept='.csv'
                                    onChange={handleCsvUpload}
                                />
                                {data.length > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        {data.length} entries loaded
                                    </p>
                                )}
                            </div>

                            <div className='flex flex-wrap gap-4'>
                                <Button
                                    onClick={handleGenerateSignatures}
                                    disabled={loading || data.length === 0}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {loading ? 'Processing...' : 'Generate Signatures & QR Codes'}
                                </Button>
                                <Button
                                    onClick={handleDownloadAll}
                                    variant="secondary"
                                    disabled={data.filter(e => e.qrCodeDataURL).length === 0}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download All as ZIP
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {data.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Generated QR Codes</CardTitle>
                                <CardDescription>
                                    {data.filter(e => e.qrCodeDataURL).length} of {data.length} processed
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className='w-full border-collapse'>
                                        <thead>
                                            <tr className="border-b">
                                                <th className='px-4 py-3 text-left font-semibold'>Name</th>
                                                <th className='px-4 py-3 text-left font-semibold'>Content (QR Data)</th>
                                                <th className='px-4 py-3 text-left font-semibold'>QR Code</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.map((entry, index) => (
                                                <tr key={index} className="border-b hover:bg-muted/50">
                                                    <td className='px-4 py-3'>{entry.name}</td>
                                                    <td className='px-4 py-3'>{entry.content}</td>
                                                    <td className='px-4 py-3'>
                                                        {entry.qrCodeDataURL ? (
                                                            <img src={entry.qrCodeDataURL} alt='QR Code' className="w-16 h-16" />
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">Pending...</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code;
}
