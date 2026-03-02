const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Constants (same as server.cjs)
const HASH_PREFIX = 'pbkdf2$';
const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 64;

const hashPassword = (plain) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(String(plain), salt, HASH_ITERATIONS, HASH_KEYLEN, 'sha512').toString('hex');
    return `${HASH_PREFIX}${HASH_ITERATIONS}$${salt}$${hash}`;
};

// Determine data directory
const defaultDataDir = path.join(__dirname, 'data');
const dataDir = process.env.ELECTRON_DATA_PATH || defaultDataDir;
const dbPath = path.join(dataDir, 'data.db');

console.log('=== SmartStock - Reset ADMIN Password ===\n');
console.log(`Database path: ${dbPath}\n`);

try {
    const db = new Database(dbPath);

    const admin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();

    if (!admin) {
        console.error('❌ ERROR: No ADMIN account found in database.');
        rl.close();
        process.exit(1);
    }

    console.log(`✓ Found ADMIN account:\n`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Full Name: ${admin.fullName || 'N/A'}`);
    console.log(`  Email: ${admin.email || 'N/A'}\n`);

    rl.question('Enter new password for ADMIN (minimum 4 characters): ', (password) => {
        if (!password || password.length < 4) {
            console.error('\n❌ ERROR: Password must be at least 4 characters.');
            rl.close();
            db.close();
            process.exit(1);
        }

        const hashedPassword = hashPassword(password);
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, admin.id);

        console.log('\n✅ ADMIN password has been reset successfully!');
        console.log(`\nYou can now login with:`);
        console.log(`  Username: ${admin.username}`);
        console.log(`  Password: <the password you just entered>\n`);

        rl.close();
        db.close();
    });
} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    rl.close();
    process.exit(1);
}
