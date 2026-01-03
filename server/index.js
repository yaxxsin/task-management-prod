import express from 'express';
import cors from 'cors';
import { DatabaseHandler } from './database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const port = 3001;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
        origin: true, // Allow all origins for development - in production, specify exact origins
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- WebSocket Logic ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room (can be userId or space:spaceId)
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    // Handle broadcast updates from clients
    socket.on('realtime_update', ({ type, data, spaceId }) => {
        if (!spaceId) return;
        console.log(`[Socket] Broadcasting ${type} ${data.id} to space:${spaceId}`);
        socket.to(`space:${spaceId}`).emit('shared_update', { type, data });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const dbHandler = new DatabaseHandler('./database.sqlite');

// Initialize Database
(async () => {
    try {
        await dbHandler.initialize();
        console.log('Connected to SQLite database using Standard Handler.');
    } catch (error) {
        console.error('Error initializing database handler:', error);
    }
})();

// --- Auth Routes ---

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
};

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const existingUser = await dbHandler.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await dbHandler.createUser({
            id: randomUUID(),
            email,
            passwordHash,
            name,
            provider: 'local'
        });

        const token = generateToken(newUser);
        res.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, avatarUrl: newUser.avatar_url } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await dbHandler.getUserByEmail(email);
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Google Login (Expects ID Token)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token, user: clientUser } = req.body; // user info from client or verify token server-side

        // In a real app, verify 'token' with Google's public keys.
        // For this demo, we accept the client's trusted info provided alongside or decode token (unsafe).
        // Let's assume client sends { email, name, picture, googleId }

        const { email, name, picture, sub: googleId } = clientUser || {};

        if (!email) return res.status(400).json({ error: 'Invalid payload' });

        let user = await dbHandler.getUserByEmail(email);

        if (!user) {
            user = await dbHandler.createUser({
                id: randomUUID(),
                email,
                name,
                provider: 'google',
                providerId: googleId,
                avatarUrl: picture
            });
        } else {
            // Update provider info if needed?
        }

        const sessionToken = generateToken(user);
        res.json({ token: sessionToken, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url || picture } });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Facebook Login
app.post('/api/auth/facebook', async (req, res) => {
    try {
        const { accessToken, userID, userInfo } = req.body;

        // Simplified: Trust client payload for demo purposes
        const { email, name, picture } = userInfo || {};

        if (!email || !name) return res.status(400).json({ error: 'Invalid payload' });

        let user = await dbHandler.getUserByEmail(email);
        if (!user) {
            user = await dbHandler.createUser({
                id: randomUUID(),
                email,
                name,
                provider: 'facebook',
                providerId: userID,
                avatarUrl: picture?.data?.url
            });
        }

        const sessionToken = generateToken(user);
        res.json({ token: sessionToken, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url } });

    } catch (error) {
        console.error('Facebook auth error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Forgot Password - Request Reset Link
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await dbHandler.getUserByEmail(email);

        // For security, always return success even if email doesn't exist
        if (!user) {
            console.log(`[Forgot Password] Email not found: ${email}`);
            return res.json({ success: true, message: 'If your email exists, a reset link has been sent.' });
        }

        // Check if user is using social login (no password)
        if (user.provider !== 'local') {
            return res.status(400).json({
                error: `This account uses ${user.provider} login. Please reset your password through ${user.provider}.`
            });
        }

        // Generate reset token
        const resetToken = randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

        // Delete any existing tokens for this user
        await dbHandler.deleteExpiredTokens();

        // Create new reset token
        await dbHandler.createPasswordResetToken(user.id, resetToken, expiresAt);

        // In production, send email here. For demo, log the reset link
        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
        console.log(`\n========================================`);
        console.log(`PASSWORD RESET LINK for ${email}:`);
        console.log(resetLink);
        console.log(`Token expires at: ${expiresAt}`);
        console.log(`========================================\n`);

        res.json({
            success: true,
            message: 'If your email exists, a reset link has been sent.',
            // For development only - remove in production!
            _dev_reset_link: resetLink
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Reset Password - Verify Token and Update Password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Verify token
        const resetToken = await dbHandler.getPasswordResetToken(token);

        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 10);

        // Update user password
        await dbHandler.updateUserPassword(resetToken.user_id, passwordHash);

        // Mark token as used
        await dbHandler.markTokenAsUsed(token);

        console.log(`[Reset Password] Password updated for user: ${resetToken.user_id}`);

        res.json({ success: true, message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Verify Reset Token (for frontend validation)
app.get('/api/auth/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token is required', valid: false });
        }

        const resetToken = await dbHandler.getPasswordResetToken(token);

        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token', valid: false });
        }

        res.json({ valid: true });

    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(500).json({ error: 'Internal Server Error', valid: false });
    }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return next(); // Proceed without user (public/legacy)

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) req.user = user;
        next();
    });
};

// Get value
app.get('/api/storage/:key', authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        let storageKey = key;
        let userId = req.user ? req.user.id : null;

        // If authenticated, use user-scoped key
        if (req.user && req.user.id) {
            storageKey = `user:${req.user.id}:${key}`;
        }

        let data = await dbHandler.get(storageKey);

        // SYNC: Merge Pending Updates if any
        if (userId && data && data.state) {
            const pending = await dbHandler.getPendingUpdates(userId);
            if (pending.length > 0) {
                console.log(`[Sync] Merging ${pending.length} pending updates for User ${userId}`);
                const state = data.state;

                pending.forEach(p => {
                    const collection = p.type + 's'; // list -> lists
                    if (!state[collection]) state[collection] = [];

                    const list = state[collection];
                    const existsIdx = list.findIndex(i => i.id === p.data.id);
                    if (existsIdx >= 0) {
                        list[existsIdx] = { ...list[existsIdx], ...p.data };
                    } else {
                        list.push(p.data);
                    }
                });
                // We do NOT save back to DB here, we just send merged view to client.
                // Client will save back eventually.
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Set value
app.post('/api/storage/:key', authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        let storageKey = key;
        const bodyLen = JSON.stringify(req.body).length;

        console.log(`[Storage] POST /api/storage/${key} - Body Size: ${bodyLen} bytes - User: ${req.user ? req.user.email : 'None'}`);

        let userId = null;

        if (req.user && req.user.id) {
            storageKey = `user:${req.user.id}:${key}`;
            userId = req.user.id;
        } else {
            console.log(`[Storage] Warning: Unauthenticated write to global key: ${key}`);
            // Optional: Block write if not authenticated
            // return res.status(401).json({ error: 'Unauthorized' });
        }

        await dbHandler.set(storageKey, req.body);

        // SYNC: Clear processed pending updates
        if (userId) {
            const pending = await dbHandler.getPendingUpdates(userId);
            if (pending.length > 0) {
                const state = req.body.state || {};
                for (const p of pending) {
                    const collection = p.type + 's';
                    const list = state[collection];
                    if (list) {
                        const found = list.find(i => i.id === p.data.id);
                        if (found) {
                            await dbHandler.clearPendingUpdate(p.id);
                            console.log(`[Sync] Cleared pending update ${p.id} (merged by client)`);
                        }
                    }
                }
            }
        }

        console.log(`[Storage] Saved key: ${storageKey}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Sharing Routes ---

// Invite User
app.post('/api/invite', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { email, resourceType, resourceId, permission } = req.body;

        if (!email || !resourceType || !resourceId) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // Check if invited user exists (optional, could invite by email pending registration)
        // For now, we allow inviting any email.

        // Check if already shared/invited
        const existing = await dbHandler.db.get(`
            SELECT id, status FROM shared_resources 
            WHERE resource_type = ? AND resource_id = ? AND invited_email = ?
        `, resourceType, resourceId, email);

        if (existing) {
            if (existing.status === 'accepted') {
                return res.status(409).json({ error: 'User already has access to this resource.' });
            } else {
                return res.status(409).json({ error: 'User is already invited.' });
            }
        }

        const id = randomUUID();
        // Insert directly into db via raw query or add method to dbHandler
        await dbHandler.db.run(`
            INSERT INTO shared_resources (id, resource_type, resource_id, owner_id, invited_email, permission, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `, id, resourceType, resourceId, req.user.id, email, permission || 'view');

        res.json({ success: true, message: 'Invitation sent' });
    } catch (error) {
        console.error('Invite error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// List Invitations (Pending)
app.get('/api/invitations', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const invites = await dbHandler.db.all(`
            SELECT * FROM shared_resources 
            WHERE invited_email = ? AND status = 'pending'
        `, req.user.email);

        res.json(invites);
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get Resource Members
app.get('/api/resource/members', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { resourceType, resourceId } = req.query;

        if (!resourceType || !resourceId) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const members = await dbHandler.db.all(`
            SELECT sr.*, u.id as user_id, COALESCE(u.name, sr.invited_email) as user_name, u.avatar_url, sr.invited_email as email
            FROM shared_resources sr
            LEFT JOIN users u ON sr.invited_email = u.email
            WHERE sr.resource_type = ? AND sr.resource_id = ?
        `, resourceType, resourceId);

        // Robustly fetch owner
        const resourceRecord = await dbHandler.db.get(`
            SELECT owner_id FROM shared_resources 
            WHERE resource_type = ? AND resource_id = ? 
            LIMIT 1
        `, resourceType, resourceId);

        if (resourceRecord && resourceRecord.owner_id) {
            const owner = await dbHandler.db.get(`
                SELECT id, COALESCE(name, email) as user_name, email, avatar_url FROM users WHERE id = ?
            `, resourceRecord.owner_id);

            if (owner) {
                // Determine if owner is already in the list to avoid duplicates
                // Note: The main query joins on invited_email. The owner is usually NOT in that list unless they invited themselves.
                // We check by user_id.
                const alreadyListed = members.some(m => m.user_id === owner.id);
                if (!alreadyListed) {
                    members.push({
                        ...owner,
                        user_id: owner.id,
                        role: 'owner',
                        status: 'accepted'
                    });
                }
            }
        }

        res.json(members);
    } catch (error) {
        console.error('Get resource members error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Accept Invitation
app.post('/api/invitations/:id/accept', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;

        await dbHandler.db.run(`
            UPDATE shared_resources 
            SET status = 'accepted' 
            WHERE id = ? AND invited_email = ?
        `, id, req.user.email);

        res.json({ success: true });
    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Leave Shared Resource
app.post('/api/shared/leave', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { resourceType, resourceId } = req.body;

        await dbHandler.db.run(`
            DELETE FROM shared_resources 
            WHERE resource_type = ? AND resource_id = ? AND invited_email = ?
        `, resourceType, resourceId, req.user.email);

        res.json({ success: true });
    } catch (error) {
        console.error('Leave shared resource error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get Shared Data
// Propagate Updates (Allow shared users to write to owner's state)
app.post('/api/shared/propagate', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { ownerId, type, data } = req.body;

        if (!ownerId || !type || !data) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        console.log(`[Propagate] User ${req.user.email} updating Owner ${ownerId} - Type: ${type}`);

        // 1. Verify Permission (Is the user allowed to edit thisOwner's space?)
        // In a real app, we should check specifically if 'data.spaceId' is a space shared with this user.
        // For 'list', 'task', etc., they usually have a spaceId.
        const spaceId = data.spaceId;
        if (spaceId) {
            const hasAccess = await dbHandler.db.get(`
                SELECT id FROM shared_resources 
                WHERE resource_type = 'space' AND resource_id = ? AND invited_email = ? AND status = 'accepted'
            `, spaceId, req.user.email);

            if (!hasAccess) {
                // strict check: if not shared explicitly, maybe they own it? (but this endpoint is for shared updates)
                if (req.user.id === ownerId) {
                    // Self-update? acceptable but usually goes through normal storage sync.
                } else {
                    return res.status(403).json({ error: 'Access denied: You are not a member of this space.' });
                }
            }
        }

        // 2. Fetch Owner's State
        const ownerKey = `user:${ownerId}:ar-generator-app-storage`;
        const ownerStateRaw = await dbHandler.get(ownerKey);

        let ownerStateJson = { state: {} };
        if (ownerStateRaw) {
            try {
                ownerStateJson = typeof ownerStateRaw === 'string' ? JSON.parse(ownerStateRaw) : ownerStateRaw;
            } catch (e) {
                console.error('[Propagate] Failed to parse owner state', e);
                return res.status(500).json({ error: 'Owner state corrupted' });
            }
        }

        const state = ownerStateJson.state || {}; // Ensure state object exists

        // 3. Apply Update
        // strategy: just push the new item to the list
        if (type === 'list') {
            state.lists = state.lists || [];
            // Check duplicates
            const exists = state.lists.find(l => l.id === data.id);
            if (!exists) {
                state.lists.push(data);
                console.log(`[Propagate] Added list ${data.name} to Owner State.`);
            } else {
                console.log(`[Propagate] List ${data.id} already exists.`);
                // Update it?
                const idx = state.lists.findIndex(l => l.id === data.id);
                state.lists[idx] = { ...state.lists[idx], ...data };
            }
        } else if (type === 'task') {
            state.tasks = state.tasks || [];
            const exists = state.tasks.find(t => t.id === data.id);
            if (!exists) {
                state.tasks.push(data);
                console.log(`[Propagate] Added task ${data.name} to Owner State.`);
            } else {
                const idx = state.tasks.findIndex(t => t.id === data.id);
                state.tasks[idx] = { ...state.tasks[idx], ...data };
            }
        } else if (type === 'folder') {
            state.folders = state.folders || [];
            const exists = state.folders.find(f => f.id === data.id);
            if (!exists) {
                state.folders.push(data);
            } else {
                const idx = state.folders.findIndex(f => f.id === data.id);
                state.folders[idx] = { ...state.folders[idx], ...data };
            }
        } else if (type === 'notification') {
            state.notifications = state.notifications || [];
            state.notifications.unshift(data);
            console.log(`[Propagate] Added notification to User ${ownerId} State.`);
        }

        // 4. Save Owner State
        // Ensure structure is preserved
        ownerStateJson.state = state;
        await dbHandler.set(ownerKey, ownerStateJson);

        // 5. Emit Real-time update via Socket.io
        io.to(ownerId).emit('shared_update', { type, data });
        // Also emit to the space room if we implement room per space (future proofing)
        if (spaceId) io.to(`space:${spaceId}`).emit('shared_update', { type, data });

        res.json({ success: true });

    } catch (error) {
        console.error('Propagate error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/shared', authenticateToken, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        // 1. Find all accepted shared resources for this user
        const sharedRecords = await dbHandler.db.all(`
            SELECT * FROM shared_resources 
            WHERE invited_email = ? AND status = 'accepted'
        `, req.user.email);

        const sharedData = {
            spaces: [],
            lists: [],
            tasks: []
        };

        // 2. For each record, fetch owner's state and extract specific resource
        for (const record of sharedRecords) {
            // Fetch owner name
            const ownerUser = await dbHandler.db.get("SELECT name FROM users WHERE id = ?", record.owner_id);
            const ownerName = ownerUser ? ownerUser.name : 'Unknown Owner';

            const ownerKey = `user:${record.owner_id}:ar-generator-app-storage`;
            let ownerStateRaw = await dbHandler.get(ownerKey);

            console.log(`[Shared] Processing share ${record.id} for resource ${record.resource_type} ${record.resource_id}`);

            if (ownerStateRaw) {
                // robustness: dbHandler.get returns parsed JSON (Object), but if double-encoded it might be a string
                if (typeof ownerStateRaw === 'string') {
                    try {
                        ownerStateRaw = JSON.parse(ownerStateRaw);
                    } catch (e) {
                        console.error('[Shared] Failed to parse ownerStateRaw:', e);
                    }
                }

                if (ownerStateRaw && ownerStateRaw.state) {
                    const ownerState = ownerStateRaw.state;

                    if (record.resource_type === 'space') {
                        const space = ownerState.spaces?.find(s => s.id === record.resource_id);
                        if (space) {
                            console.log(`[Shared] Found space: ${space.name}`);

                            // Add the space
                            sharedData.spaces.push({
                                ...space,
                                isShared: true,
                                ownerId: record.owner_id,
                                ownerName: ownerName,
                                permission: record.permission,
                                name: `${space.name} (Shared)`
                            });

                            // Init arrays if needed
                            sharedData.folders = sharedData.folders || [];
                            sharedData.lists = sharedData.lists || [];
                            sharedData.tasks = sharedData.tasks || [];

                            // Fetch related Folders
                            const spaceFolders = ownerState.folders?.filter(f => f.spaceId === space.id) || [];
                            spaceFolders.forEach(f => {
                                sharedData.folders.push({ ...f, isShared: true });
                            });

                            // Fetch related Lists
                            const spaceLists = ownerState.lists?.filter(l => l.spaceId === space.id) || [];
                            spaceLists.forEach(l => {
                                sharedData.lists.push({ ...l, isShared: true });
                            });

                            // Fetch Tasks for those lists
                            const listIds = new Set(spaceLists.map(l => l.id));
                            // Also include tasks directly in space (if applicable in data model, usually tasks are in lists, but check spaceId)
                            const spaceTasks = ownerState.tasks?.filter(t => listIds.has(t.listId) || t.spaceId === space.id) || [];

                            spaceTasks.forEach(t => {
                                sharedData.tasks.push({ ...t, isShared: true });
                            });

                        } else {
                            console.log(`[Shared] Space ${record.resource_id} not found in owner ${record.owner_id} state.`);
                            // Optional: Check if we have spaces at all
                            console.log(`[Shared] Owner has ${ownerState.spaces?.length} spaces.`);
                        }
                    }
                    // Handle other types similarly...
                } else {
                    console.log(`[Shared] Owner state invalid (no .state) for key: ${ownerKey}`);
                }
            } else {
                console.log(`[Shared] Owner state not found for key: ${ownerKey}`);
            }
        }

        res.json(sharedData);

    } catch (error) {
        console.error('Get shared data error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on:`);
    console.log(`  - Local:   http://localhost:${port}`);
    console.log(`  - Network: http://<your-ip>:${port}`);
    console.log(`Note: Replace <your-ip> with your machine's IP address`);
});
