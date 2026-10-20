# ForgeOS Backend and Integrations Reference

## Purpose & Architecture
This reference documents `@forgeos/integrations`, which provides local and production backend capabilities: transactional ACID JSON persistence, RBAC authentication, AES-256-GCM secret management, and tamper-evident audit logging.

---

## 1. Transactional ACID JSON Database (`StructuredDatabase`)

`StructuredDatabase` provides collection-based persistence backed by the filesystem without requiring an external database daemon:
- **Atomic Writes**: Writes to a temporary file (`.tmp`) and performs an atomic rename, preventing data corruption on unexpected process shutdown.
- **ACID Transactions**: In-memory write queues ensure sequential writes.
- **Collection CRUD**:
  - `insert(collection, document)`
  - `findById(collection, id)`
  - `find(collection, filterFn)`
  - `update(collection, id, updates)`
  - `delete(collection, id)`

```javascript
import { StructuredDatabase } from '@forgeos/integrations';

const db = new StructuredDatabase('./projects/.forgeos-db.json');
const project = await db.insert('projects', {
  id: 'studyos',
  name: 'StudyOS Application',
  status: 'active',
});
```

---

## 2. Authentication & Role-Based Access Control (`AuthService`)

`AuthService` manages users, password hashes, session tokens, and permission enforcement:
- **Token Format**: Bearer session tokens (`fgs_<uuid>`).
- **RBAC Roles**:
  - `owner`: Full access to all actions, including production deployment and secret changes.
  - `developer`: Can create projects, edit specifications, run investigations, and execute builds.
  - `viewer`: Read-only access to projects and live previews.

```javascript
import { AuthService } from '@forgeos/integrations';

const auth = new AuthService();

// Register a developer
const user = auth.registerUser({
  email: 'dev@forgeos.local',
  name: 'Developer Alice',
  role: 'developer',
});

// Check permissions
auth.canPerform(user.role, 'build');  // true
auth.canPerform(user.role, 'deploy'); // false (requires 'owner')
```

---

## 3. Cryptographic Secret Management (`SecretManager`)

`SecretManager` stores and retrieves sensitive API tokens using authenticated AES-256-GCM encryption:
- **Encryption**: AES-256-GCM with a 32-byte key (`FORGEOS_SECRET_KEY`) and unique 12-byte initialization vectors (IVs).
- **Masking**: Safe display masking function `maskSecret(str)` replaces all but the first 4 characters with `****` for terminal logs and UI display.

```javascript
import { SecretManager } from '@forgeos/integrations';

const secrets = new SecretManager();
const encrypted = secrets.encryptSecret('sk-live-1234567890abcdef');
const decrypted = secrets.decryptSecret(encrypted);
console.log(secrets.maskSecret(decrypted)); // 'sk-l********************'
```

---

## 4. Tamper-Evident Audit Logging (`AuditLogger`)

`AuditLogger` records all security-critical operations to the database `audit_logs` collection:
- **Recorded Fields**: `timestamp`, `actor`, `action`, `targetEntity`, `status`, `details`, `clientIp`.
- **Logged Events**: User registration, login, project creation, build execution, production deployment, and rollbacks.

```javascript
import { AuditLogger } from '@forgeos/integrations';

const logger = new AuditLogger(db);
await logger.logEvent({
  actor: 'usr_admin',
  action: 'deploy_production',
  targetEntity: 'studyos',
  status: 'success',
  details: { deploymentId: 'dep_123', provider: 'cloudflare_pages' },
});
```

---

## Related References
- [Security](security.md)
- [Builds and Deployment](builds-and-deployment.md)
- [Architecture](architecture.md)
