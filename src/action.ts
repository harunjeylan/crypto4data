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
    console.log('signatureData', signatureData);
    try {
        // Convert private key string to KeyObject
        const keyObject = crypto.createPrivateKey(privateKey);

        // Create signer and let it handle hashing
        const sign = crypto.createSign('SHA256');
        sign.update(signatureData);
        sign.end();

        const rawSignature = sign.sign(keyObject);
        return rawSignature.toString('base64url');
    } catch (error) {
        console.error('Error generating signature:', error);
        throw error;
    }
};


export const verifySignature = async (signatureData: string, signature: string, publicKey: string) => {
    if (!signatureData || !signature || !publicKey) {
        console.error('Please provide signature data, a signature ID, and a public key.');
        return false;
    }

    try {
        console.log('signatureData', signatureData);

        // Convert public key string to KeyObject
        const keyObject = crypto.createPublicKey(publicKey);

        // Create verifier and let it handle hashing
        const verify = crypto.createVerify('SHA256');
        verify.update(signatureData);
        verify.end();

        const isValid = verify.verify(keyObject, Buffer.from(signature, 'base64url'));
        return isValid;
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
};

