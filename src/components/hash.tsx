'use client';

import { generateSignature } from '@/action';
import { useEffect, useState } from 'react';
import QRCodeGenerator from './qrcode';

export default function Hash() {
    const [data, setData] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');

    const [qrCodeDataURL, setQrCodeDataURL] = useState('');
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        const code = generateUniqueCode()
        setCode(code);
    }, [data])

    const handleGenerateSignature = async () => {
        if (!privateKey || !data) {
            alert('Both Private Key and Signature Data are required!');
            return;
        }
        try {
            setLoading(true);
            const shortHash = await generateSignature(`${data}:${code}`, privateKey);
            const signatureData = `${data}:${code}:${shortHash}`
            if (signatureData) {
                setSignature(signatureData)
                await handleSubmit(signatureData)
            }
        } catch (error: any) {
            alert('Error generating signature: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (signatureData: string) => {
        try {
            const response = await fetch('/api/qrcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureData }),
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
                <textarea onChange={(e) => setData(e.target.value)} rows={8} className='border w-full' />
            </label>
            <div>
                Preview:
                <p className='border w-full p-4 rounded-md'>
                    {data && `Code: ${code}; Data: ${data}`}
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
                        <textarea readOnly value={signature} rows={8} className='border w-full' />
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


function generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code
}
