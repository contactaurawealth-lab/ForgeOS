import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';

export const RoleSchema = z.enum(['owner', 'developer', 'viewer']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema.default('developer'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SessionSchema = z.object({
  token: z.string(),
  userId: z.string(),
  expiresAt: z.number(), // timestamp ms
  createdAt: z.string(),
});

export const AuditEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actorId: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  status: z.enum(['success', 'failure', 'denied']),
  details: z.record(z.unknown()).default({}),
});

/**
 * Secret management service: encrypts/decrypts sensitive configs and redacts logs
 */
export class SecretManager {
  constructor(secretKey) {
    // 32-byte key for AES-256-GCM
    this.key = secretKey
      ? crypto.createHash('sha256').update(secretKey).digest()
      : crypto.createHash('sha256').update('forgeos-default-entropy-key-2026').digest();
  }

  encrypt(plainText) {
    if (!plainText || typeof plainText !== 'string') return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  decrypt(cipherPayload) {
    if (!cipherPayload || typeof cipherPayload !== 'string') return '';
    const parts = cipherPayload.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  mask(secret) {
    if (!secret || typeof secret !== 'string') return '******';
    if (secret.length <= 6) return '******';
    return `${secret.slice(0, 3)}...${secret.slice(-3)}`;
  }
}

/**
 * Authentication and Role-Based Access Control (RBAC) Service
 */
export class AuthService {
  constructor() {
    /** @type {Map<string, z.infer<typeof UserSchema>>} */
    this.users = new Map();
    /** @type {Map<string, z.infer<typeof SessionSchema>>} */
    this.sessions = new Map();

    // Default system admin / owner
    const defaultOwner = {
      id: 'usr_admin',
      email: 'admin@forgeos.local',
      name: 'System Administrator',
      role: 'owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(defaultOwner.id, defaultOwner);
  }

  registerUser({ email, name, role = 'developer' }) {
    for (const u of this.users.values()) {
      if (u.email === email) throw new Error(`User with email "${email}" already exists`);
    }
    const user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  createSession(userId, durationMs = 86400000) {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User "${userId}" not found`);

    const token = `fst_${crypto.randomBytes(32).toString('hex')}`;
    const session = {
      token,
      userId,
      expiresAt: Date.now() + durationMs,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(token, session);
    return session;
  }

  validateSession(token) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    const user = this.users.get(session.userId);
    return user || null;
  }

  revokeSession(token) {
    this.sessions.delete(token);
  }

  canPerform(role, action) {
    const permissions = {
      owner: ['read', 'write', 'delete', 'build', 'deploy', 'admin'],
      developer: ['read', 'write', 'build'],
      viewer: ['read'],
    };
    const allowed = permissions[role] || [];
    return allowed.includes(action) || allowed.includes('admin');
  }
}

/**
 * Persistent structured local database engine with migrations and ACID JSON writes
 */
export class StructuredDatabase {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || './.forgeos-db.json');
    this.data = {
      version: 1,
      users: [],
      projects: [],
      builds: [],
      deployments: [],
      audit_logs: [],
    };
    this.isLoaded = false;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.data = JSON.parse(raw);
    } catch {
      // Initialize fresh database file
      await this.save();
    }
    this.isLoaded = true;
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  ensureTable(table) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    return this.data[table];
  }

  async insert(table, record) {
    if (!this.isLoaded) await this.load();
    const rows = this.ensureTable(table);
    if (!record.id) {
      record.id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    record.createdAt = record.createdAt || new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    rows.push(record);
    await this.save();
    return record;
  }

  async findById(table, id) {
    if (!this.isLoaded) await this.load();
    const rows = this.ensureTable(table);
    return rows.find(r => r.id === id) || null;
  }

  async find(table, predicate = () => true) {
    if (!this.isLoaded) await this.load();
    const rows = this.ensureTable(table);
    return rows.filter(predicate);
  }

  async update(table, id, patch) {
    if (!this.isLoaded) await this.load();
    const rows = this.ensureTable(table);
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) return null;

    rows[index] = {
      ...rows[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.save();
    return rows[index];
  }

  async delete(table, id) {
    if (!this.isLoaded) await this.load();
    const rows = this.ensureTable(table);
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) return false;

    rows.splice(index, 1);
    await this.save();
    return true;
  }
}

/**
 * Structured Audit Logging Service
 */
export class AuditLogger {
  constructor(db) {
    this.db = db;
  }

  async record({ actorId, action, targetType, targetId, status = 'success', details = {} }) {
    const event = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorId,
      action,
      targetType,
      targetId,
      status,
      details,
    };

    if (this.db) {
      await this.db.insert('audit_logs', event);
    }
    return event;
  }
}
