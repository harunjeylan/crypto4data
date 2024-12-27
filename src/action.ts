'use server'

import crypto from "crypto";

export const generateKeyPair = async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    return {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string
    }
};

export const generateSignature = async (signatureData: string, privateKey: string): Promise<string> => {
    if (!signatureData || !privateKey) {
        throw new Error('Please provide signature data and a private key.');
    }

    try {
        const hash = crypto.createHash('sha256').update(signatureData).digest();

        const sign = crypto.createSign('SHA256');
        sign.update(hash);
        sign.end();

        const rawSignature = sign.sign(privateKey);
        return rawSignature.toString('base64url');
    } catch (error) {
        console.error('Error generating signature:', error);
        throw error;
    }
};


export const verifySignature = async (signatureData: string, signature: string, publicKey: string) => {
    if (!signatureData || !signature || !publicKey) {
        alert('Please provide signature data, a signature ID, and a public key.');
        return false;
    }

    const hash = crypto.createHash('sha256').update(signatureData).digest();

    const verify = crypto.createVerify('SHA256');
    verify.update(hash);
    verify.end();

    const isValid = verify.verify(publicKey, Buffer.from(signature, 'base64url'));
    return isValid
};

