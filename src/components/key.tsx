'use client';

import { generateKeyPair } from '@/action';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Key as KeyIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b bg-card px-6 py-4">
                <div className="flex items-center gap-4 mb-4">

                    <div className="flex items-center gap-2">
                        <KeyIcon className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Key Generation</h2>
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
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <KeyIcon className="h-5 w-5" />
                                Key Generation
                            </CardTitle>
                            <CardDescription>
                                Generate RSA key pairs for signing and verifying certificates
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                onClick={handleGenerateKeys}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? 'Generating...' : 'Generate New Key Pair'}
                            </Button>

                            {privateKey && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="private-key">Private Key</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(privateKey)}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                    <Textarea
                                        id="private-key"
                                        readOnly
                                        value={privateKey}
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}

                            {publicKey && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="public-key">Public Key</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(publicKey)}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                    <Textarea
                                        id="public-key"
                                        readOnly
                                        value={publicKey}
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
