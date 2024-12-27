'use client';

import { generateSignature } from '@/action';
import { useEffect, useState } from 'react';
import QRCodeGenerator from './qrcode';

export default function Hash() {
    const [signatureData, setSignatureData] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');

    const [qrCodeDataURL, setQrCodeDataURL] = useState('');
    const [fileName, setFileName] = useState('');



    function generateUniqueCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';

        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }
        return code
    }

    useEffect(() => {
        const code = generateUniqueCode()
        setCode(code);
    }, [signatureData])

    const handleGenerateSignature = async () => {
        if (!privateKey || !signatureData) {
            alert('Both Private Key and Signature Data are required!');
            return;
        }
        try {
            setLoading(true);
            const hash = await generateSignature(JSON.stringify({ Code: `${code}`, Data: `${signatureData}` }), privateKey);
            if (hash) {
                setSignature(hash)
                await handleSubmit(hash)
            }
        } catch (error: any) {
            alert('Error generating signature: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (hash: string) => {
        try {
            const response = await fetch('/api/qrcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash, code, data: signatureData }),
            });

            if (response.ok) {
                const { qrCodeDataURL, fileName } = await response.json();
                setQrCodeDataURL(qrCodeDataURL);
                setFileName(fileName);
            } else {
                const { error } = await response.json();
                alert(error || 'Failed to generate QR code.');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred. Please try again.');
        }
    };



    const handleDownload = () => {
        if (!qrCodeDataURL || !fileName) return;

        const link = document.createElement('a');
        link.href = qrCodeDataURL;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className='space-y-4'>
            <h2>Generate Signature</h2>
            <label>
                Private Key
                <textarea onChange={(e) => setPrivateKey(e.target.value)} rows={8} className='border w-full' />
            </label>
            <label>
                Signature Data
                <textarea onChange={(e) => setSignatureData(e.target.value)} rows={8} className='border w-full' />
            </label>
            <div>
                Preview:
                <p className='border w-full p-4 rounded-md'>
                    {signatureData && `Code: ${code}; Data: ${signatureData}`}
                </p>
            </div>
            <button onClick={handleGenerateSignature} disabled={loading} className='bg-blue-500 px-4 py-2 rounded-md'>
                {loading ? 'Generating...' : 'Generate Signature'}
            </button>
            <div>
                Signature
                {signature && (
                    <div>
                        <h3>Generated Signature</h3>
                        <textarea readOnly value={`${signatureData}:${code}:${signature}`} rows={8} className='border w-full' />
                    </div>
                )}
                QR Code
                {qrCodeDataURL && (
                    <div>
                        <h3>Preview:</h3>
                        <img src={qrCodeDataURL} alt="QR Code" />
                        <button onClick={handleDownload} className='bg-blue-500 px-4 py-2 rounded-md'>Download {fileName}</button>
                    </div>
                )}
            </div>
        </div>
    );
}
