/**
 * Web Crypto API Utility for RSA-OAEP Encryption
 * Used to securely encrypt image URLs during submission and decrypt them during voting.
 */

// Generate a new RSA Keypair (Public/Private)
export async function generateRSAKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );

    // Export to JWK format for easy storage in Firestore
    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    return {
        publicKey: JSON.stringify(publicKeyJwk),
        privateKey: JSON.stringify(privateKeyJwk),
    };
}

// Encrypt a string (like a URL) using the Public Key (JWK JSON string)
export async function encryptUrl(url: string, publicKeyJson: string): Promise<string> {
    try {
        const jwk = JSON.parse(publicKeyJson);
        const publicKey = await window.crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['encrypt']
        );

        const encodedUrl = new TextEncoder().encode(url);
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            encodedUrl
        );

        // Convert Buffer to Base64 manually
        const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
        return btoa(String.fromCharCode.apply(null, encryptedArray));
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt URL');
    }
}

// Decrypt a string (the Base64 encrypted URL) using the Private Key (JWK JSON string)
export async function decryptUrl(encryptedBase64: string, privateKeyJson: string): Promise<string> {
    try {
        const jwk = JSON.parse(privateKeyJson);
        const privateKey = await window.crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt']
        );

        const binaryString = atob(encryptedBase64);
        const encryptedBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            encryptedBytes[i] = binaryString.charCodeAt(i);
        }

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            encryptedBytes
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt URL');
    }
}
