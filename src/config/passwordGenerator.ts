import crypto from 'crypto';

export async function generatePassword(): Promise<string> {
    const length = 8;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~';
    let password = '';
    const charsetLength = charset.length;

    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charsetLength);
        password += charset[randomIndex];
    }

    return password;
}