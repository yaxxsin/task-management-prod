import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function clearAllData() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    console.log('Menghapus semua data...');

    await db.run('DELETE FROM app_state');
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM shared_resources');
    await db.run('DELETE FROM pending_updates');
    await db.run('DELETE FROM password_reset_tokens');

    console.log('✅ Semua data berhasil dihapus!');
    console.log('Struktur tabel tetap dipertahankan.');

    await db.close();
}

clearAllData().catch(console.error);
