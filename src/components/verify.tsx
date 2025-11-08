'use client';

import { verifySignature } from '@/action';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Verify() {
    const [signatureData, setSignatureData] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    const handleVerifySignature = async () => {
        if (!signatureData || !publicKey) {
            alert('Public Key and Signature Data are required!');
            setLoading(false);
            return;
        }
        const data = signatureData.split(":").slice(0, -1);
        const signature = signatureData.split(":").pop();
        if (signature) {
            setLoading(true);
            const valid = await verifySignature(data.join(":"), signature, publicKey);
            setIsValid(valid);
            setLoading(false);
        } else {
            setLoading(false);
            setIsValid(false);
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b bg-card px-6 py-4">
                <div className="flex items-center gap-4 mb-4">

                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Verify Signature</h2>
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
                                <Shield className="h-5 w-5" />
                                Verify Signature
                            </CardTitle>
                            <CardDescription>
                                Verify the authenticity of a certificate signature using the public key
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="public-key-verify">Public Key</Label>
                                <Textarea
                                    id="public-key-verify"
                                    onChange={(e) => setPublicKey(e.target.value)}
                                    rows={8}
                                    className="font-mono text-sm"
                                    placeholder="Paste the public key here..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signature-data">Signature Data</Label>
                                <Textarea
                                    id="signature-data"
                                    onChange={(e) => setSignatureData(e.target.value)}
                                    rows={8}
                                    className="font-mono text-sm"
                                    placeholder="Paste the signature data here..."
                                />
                            </div>

                            <Button
                                onClick={handleVerifySignature}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? 'Verifying...' : 'Verify Signature'}
                            </Button>

                            {isValid !== null && (
                                <Card className={isValid ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            {isValid ? (
                                                <>
                                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                    <div>
                                                        <h3 className="font-semibold text-green-900 dark:text-green-100">Verification Result</h3>
                                                        <p className="text-green-700 dark:text-green-300">Signature is Valid</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-6 w-6 text-red-600" />
                                                    <div>
                                                        <h3 className="font-semibold text-red-900 dark:text-red-100">Verification Result</h3>
                                                        <p className="text-red-700 dark:text-red-300">Signature is Invalid</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}