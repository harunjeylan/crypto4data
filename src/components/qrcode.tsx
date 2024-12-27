'use client';

import React, { useState } from 'react';

export default function QRCodeGenerator({ data }: { data: string }) {
    const [qrCodeDataURL, setQrCodeDataURL] = useState('');
    const [fileName, setFileName] = useState('');


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/qrcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
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
        <div>
            {qrCodeDataURL && (
                <div>
                    <h3>Preview:</h3>
                    <img src={qrCodeDataURL} alt="QR Code" />
                    <button onClick={handleDownload}>Download {fileName}</button>
                </div>
            )}
        </div>
    );
}
