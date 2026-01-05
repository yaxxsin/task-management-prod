import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export class DatabaseHandler {
    db;
    dbPath;

    constructor(dbPath = './database.sqlite') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        try {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // Enable WAL mode for better concurrent read/write performance
            // This is critical for multi-user access (10+ users)
            await this.db.exec('PRAGMA journal_mode = WAL;');
            await this.db.exec('PRAGMA busy_timeout = 5000;'); // Wait 5s if database is locked
            await this.db.exec('PRAGMA synchronous = NORMAL;'); // Good balance of safety and speed

            console.log('Database optimizations applied: WAL mode enabled');

            // Standardize schema with separate metadata if needed, 
            // but for Zustand we primarily need Key-Value.
            // unique key constraint, and timestamps for syncing
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS app_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    name TEXT,
                    provider TEXT DEFAULT 'local',
                    provider_id TEXT,
                    avatar_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS shared_resources (
                    id TEXT PRIMARY KEY,
                    resource_type TEXT NOT NULL, -- 'space', 'list', 'folder', 'task'
                    resource_id TEXT NOT NULL,
                    owner_id TEXT NOT NULL,
                    invited_email TEXT NOT NULL,
                    status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
                    permission TEXT DEFAULT 'view', -- 'view', 'edit'
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS pending_updates (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    type TEXT NOT NULL, -- 'list', 'task', etc
                    data TEXT NOT NULL, -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
            `);

            console.log('Database schema initialized: tables ready.');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async get(key) {
        if (!this.db) throw new Error('Database not initialized');
        const result = await this.db.get('SELECT value FROM app_state WHERE key = ?', key);
        return result ? JSON.parse(result.value) : null;
    }

    async set(key, value) {
        if (!this.db) throw new Error('Database not initialized');
        const stringValue = JSON.stringify(value);
        const timestamp = new Date().toISOString();

        await this.db.run(`
            INSERT INTO app_state (key, value, updated_at) 
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value, 
            updated_at = excluded.updated_at
        `, key, stringValue, timestamp);
    }

    async getAll() {
        if (!this.db) throw new Error('Database not initialized');
        const result = await this.db.all('SELECT key, value FROM app_state');
        return result.reduce((acc, row) => {
            acc[row.key] = JSON.parse(row.value);
            return acc;
        }, {});
    }

    // --- Pending Updates (Sync) ---

    async addPendingUpdate(ownerId, type, data) {
        if (!this.db) throw new Error('Database not initialized');
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        await this.db.run(`
            INSERT INTO pending_updates (id, owner_id, type, data) VALUES (?, ?, ?, ?)
        `, id, ownerId, type, JSON.stringify(data));
        console.log(`[DB] Added pending update ${id} for owner ${ownerId}`);
        return id;
    }

    async getPendingUpdates(ownerId) {
        if (!this.db) throw new Error('Database not initialized');
        const rows = await this.db.all('SELECT * FROM pending_updates WHERE owner_id = ?', ownerId);
        return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
    }

    async clearPendingUpdate(id) {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run('DELETE FROM pending_updates WHERE id = ?', id);
    }

    // --- User Methods ---

    async createUser({ id, email, passwordHash, name, provider = 'local', providerId = null, avatarUrl = null }) {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run(`
            INSERT INTO users (id, email, password_hash, name, provider, provider_id, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, id, email, passwordHash, name, provider, providerId, avatarUrl);
        return { id, email, name, provider, avatarUrl };
    }

    async getUserByEmail(email) {
        if (!this.db) throw new Error('Database not initialized');
        return await this.db.get('SELECT * FROM users WHERE email = ?', email);
    }

    async getUserById(id) {
        if (!this.db) throw new Error('Database not initialized');
        return await this.db.get('SELECT * FROM users WHERE id = ?', id);
    }

    // --- Password Reset Methods ---

    async createPasswordResetToken(userId, token, expiresAt) {
        if (!this.db) throw new Error('Database not initialized');
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        await this.db.run(`
            INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
            VALUES (?, ?, ?, ?)
        `, id, userId, token, expiresAt);
        return { id, token, expiresAt };
    }

    async getPasswordResetToken(token) {
        if (!this.db) throw new Error('Database not initialized');
        return await this.db.get(`
            SELECT * FROM password_reset_tokens 
            WHERE token = ? AND used = 0 AND expires_at > datetime('now')
        `, token);
    }

    async markTokenAsUsed(token) {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', token);
    }

    async deleteExpiredTokens() {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now') OR used = 1");
    }

    async updateUserPassword(userId, passwordHash) {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run('UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, userId);
    }
}
