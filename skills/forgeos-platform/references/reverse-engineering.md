# ForgeOS Reverse-Engineering Reference

## Purpose & Scope
This reference documents `@forgeos/rea-adapter`, the bridge connecting ForgeOS to Reverse Engineer Anything (`morluto/rea`). It enables authorized software analysis, evidence dossier creation, and conversion into clean ForgeOS application specifications.

---

## Security Invariants

### 1. Mandatory Authorization Confirmation
Investigations strictly require explicit confirmation that the user owns or is legally authorized to inspect the target:
```javascript
{ authorizationConfirmed: true } // Mandatory
```
Requests without this flag are rejected with HTTP 400.

### 2. Strict SSRF Protection (`validateTargetUrl`)
All inspection URLs are checked against an SSRF deny-list before network access:
- **Loopback**: `127.0.0.1`, `localhost`, `::1`.
- **Link-Local**: `169.254.0.0/16`.
- **Cloud Instance Metadata**: `169.254.169.254`, `metadata.google.internal`.
- **RFC 1918 Private Subnets**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- **Non-HTTP Protocols**: `file://`, `ftp://`, `gopher://` are rejected.

### 3. Credential Redaction (`redactSensitiveData`)
All captured strings and AST objects are recursively sanitized with regex masks:
- API Keys: `sk-[a-zA-Z0-9_-]{20,}` ➔ `[REDACTED_API_KEY]`
- Bearer Tokens: `Bearer [^"'\s]+` ➔ `Bearer [REDACTED_TOKEN]`
- Password fields ➔ `[REDACTED_SECRET]`

---

## Investigation Lifecycle

```
1. Create Investigation
   manager.createInvestigation({ targetPath, targetType, authorizationConfirmed: true })
        │
        ▼
2. Gather Evidence & Synthesize Feature Dossier
   - Static Observations (AST, DOM hierarchy, routes)
   - Hypotheses with confidence ratings (0.0 to 1.0)
   - Limitations & unresolved questions
        │
        ▼
3. User Review Gate
   manager.approveFinding(investigationId, findingId)
   manager.rejectFinding(investigationId, findingId)
        │
        ▼
4. Convert to ForgeOS AppSpecification
   manager.convertToAppSpecification(investigationId)
        │
        ▼
5. Feed into Codegen & Orchestrator
   Produces original, clean TypeScript/React implementation
```

---

## Code Example

```javascript
import { InvestigationManager } from '@forgeos/rea-adapter';

const manager = new InvestigationManager();

// 1. Start investigation on authorized web app bundle
const dossier = await manager.createInvestigation({
  targetPath: 'https://cdn.example.com/assets/app.js',
  targetType: 'javascript_bundle',
  authorizationConfirmed: true,
});

console.log('Discovered Findings:', dossier.findings.length);

// 2. Review and approve findings
for (const finding of dossier.findings) {
  if (finding.confidence >= 0.7) {
    manager.approveFinding(dossier.investigationId, finding.id);
  }
}

// 3. Convert approved findings into ForgeOS AppSpecification
const spec = manager.convertToAppSpecification(dossier.investigationId);
console.log('Generated App Title:', spec.metadata.title);
console.log('Generated Routes:', spec.routes.map(r => r.path));
```

---

## Important Legal & Technical Boundaries
- ForgeOS **does not** recover inaccessible proprietary backend code or database schemas.
- Findings are structured abstractions (routes, UI components, data structures) used to synthesize an original application implementation.

---

## Related References
- [Application Schema](application-schema.md)
- [Studio and Preview](studio-and-preview.md)
- [Security](security.md)
