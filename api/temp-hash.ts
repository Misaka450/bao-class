// Script to generate password hash for admin user
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

const adminPassword = 'admin123';
const adminHash = await hashPassword(adminPassword);
console.log('Admin password hash:', adminHash);

const teacherPassword = 'teacher123';
const teacherHash = await hashPassword(teacherPassword);
console.log('Teacher password hash:', teacherHash);
