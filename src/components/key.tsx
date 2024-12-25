'use client';

import { generateKeyPair } from '@/action';
import React, { useState } from 'react';

export default function Key() {
    const [privateKey, setPrivateKey] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerateKeys = async () => {
        try {
            setLoading(true);
            const keys = await generateKeyPair();
            setPrivateKey(keys.privateKey);
            setPublicKey(keys.publicKey);
        } catch (error: any) {
            alert('Error generating keys: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='space-y-4'>
            <h2>Key Generation</h2>
            <button onClick={handleGenerateKeys} disabled={loading} className='bg-blue-500 px-4 py-2 rounded-md'>
                {loading ? 'Generating...' : 'Generate Keys'}
            </button>
            {privateKey && (
                <div>
                    <h3>Private Key</h3>
                    <textarea readOnly value={privateKey} rows={8} className='border w-full' />
                </div>
            )}
            {publicKey && (
                <div>
                    <h3>Public Key</h3>
                    <textarea readOnly value={publicKey} rows={8} className='border w-full' />
                </div>
            )}
        </div>
    );
}
