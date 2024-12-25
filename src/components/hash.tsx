'use client';

import { generateSignature } from '@/action';
import { useState } from 'react';

export default function Hash() {
    const [signatureData, setSignatureData] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerateSignature = async () => {
        if (!privateKey || !signatureData) {
            alert('Both Private Key and Signature Data are required!');
            return;
        }
        try {
            setLoading(true);
            const hash = await generateSignature(signatureData, privateKey);
            if (hash) setSignature(hash)
        } catch (error: any) {
            alert('Error generating signature: ' + error.message);
        } finally {
            setLoading(false);
        }
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
            <button onClick={handleGenerateSignature} disabled={loading} className='bg-blue-500 px-4 py-2 rounded-md'>
                {loading ? 'Generating...' : 'Generate Signature'}
            </button>

            {signature && (
                <div>
                    <h3>Generated Signature</h3>
                    <textarea readOnly value={signature} rows={8} className='border w-full' />
                </div>
            )}
        </div>
    );
}
