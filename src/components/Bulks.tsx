'use client';

import { generateSignature } from '@/action';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { ChangeEvent, useState } from 'react';

type DataContent = {
    name: string;
    content: string;
    date: string;
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
                        .filter((row: any) => row.name && row.content && row.date)
                        .map((row: any) => ({
                            name: row.name,
                            content: row.content,
                            date: row.date
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
                    const shortHash = await generateSignature(`${entry.name}:${entry.content}:${entry.date}:${code}`, privateKey);
                    const signatureData = `${entry.name}:${entry.content}:${entry.date}:${code}:${shortHash}`;

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
        <div className='space-y-4 py-4'>
            <h2>Bulk Signature & QR Code Generator</h2>
            <label>
                Private Key
                <textarea onChange={(e) => setPrivateKey(e.target.value)} rows={4} className='border w-full' />
            </label>
            <div>
                <label htmlFor='csvUpload' className='block mb-2'>Upload CSV File:</label>
                <input type='file' id='csvUpload' accept='.csv' onChange={handleCsvUpload} className='block w-full text-sm text-gray-500' />
            </div>
            <div className='flex space-x-4'>
                <button onClick={handleGenerateSignatures} disabled={loading} className='bg-blue-500 px-4 py-2 rounded-md'>
                    {loading ? 'Processing...' : 'Generate Signatures & QR Codes'}
                </button>
                <button onClick={handleDownloadAll} className='bg-green-500 px-4 py-2 rounded-md'>
                    Download All as ZIP
                </button>
            </div>
            <div className=''>
                {data.length > 0 && (
                    <table className='w-full border mt-4'>
                        <thead>
                            <tr>
                                <th className='border px-4 py-2'>Name</th>
                                <th className='border px-4 py-2'>Content</th>
                                <th className='border px-4 py-2'>Date</th>
                                <th className='border px-4 py-2'>QR Code</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((entry, index) => (
                                <tr key={index} className='border'>
                                    <td className='border px-4 py-2'>{entry.name}</td>
                                    <td className='border px-4 py-2'>{entry.content}</td>
                                    <td className='border px-4 py-2'>{entry.date}</td>
                                    <td className='border px-4 py-2'>
                                        {entry.qrCodeDataURL && <img src={entry.qrCodeDataURL} alt='QR Code' width={50} />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
