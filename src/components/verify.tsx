'use client';

import { verifySignature } from '@/action';
import { useState } from 'react';

export default function Verify() {
    const [signatureData, setSignatureData] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    const handleVerifySignature = async () => {
        const [data, code, signature] = signatureData.split(":")
        if (!publicKey || !code || !signature) {
            alert('Public Key, Signature, and Signature Data are required!');
            return;
        }
        try {
            setLoading(true);
            const valid = await verifySignature(JSON.stringify({ Code: `${code}`, Data: `${data}` }), signature, publicKey);
            setIsValid(valid);
        } catch (error: any) {
            alert('Error verifying signature: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='space-y-4'>
            <h2>Verify Signature</h2>
            <label>
                Public Key
                <textarea onChange={(e) => setPublicKey(e.target.value)} rows={8} className='border w-full' />
            </label>
            <label>
                Signature Data
                <textarea onChange={(e) => setSignatureData(e.target.value)} rows={8} className='border w-full' />
            </label>
            <button onClick={handleVerifySignature} disabled={loading} className='bg-blue-500 px-4 py-2 rounded-md'>
                {loading ? 'Verifying...' : 'Verify Signature'}
            </button>

            {isValid !== null && (
                <div>
                    <h3>Verification Result</h3>
                    <p style={{ color: isValid ? 'green' : 'red' }}>
                        {isValid ? 'Signature is Valid' : 'Signature is Invalid'}
                    </p>
                </div>
            )}
        </div>
    );
}
