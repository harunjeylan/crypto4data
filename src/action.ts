'use server'

import crypto from "crypto"
import QRCode from "qrcode"

export const generateKeyPair = async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    return {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string
    }
};

// Generate Signature ID
export const generateSignature = async (signatureData: string, privateKey: string) => {
    if (!signatureData || !privateKey) {
        alert('Please provide signature data and a private key.');
        return;
    }

    const hash = crypto.createHash('sha256').update(signatureData).digest('hex');
    const sign = crypto.createSign('SHA256');
    sign.update(hash);
    sign.end();
    const signature = sign.sign(privateKey, 'hex');
    return signature
};

// Verify Signature ID
export const verifySignature = async (signatureData: string, signature: string, publicKey: string) => {
    if (!signatureData || !signature || !publicKey) {
        alert('Please provide signature data, a signature ID, and a public key.');
        return false;
    }

    const hash = crypto.createHash('sha256').update(signatureData).digest('hex');
    const verify = crypto.createVerify('SHA256');
    verify.update(hash);
    verify.end();
    const isValid = verify.verify(publicKey, signature, 'hex');
    return isValid
};

