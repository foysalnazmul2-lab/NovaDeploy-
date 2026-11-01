# Firestore Security Specification (`security_spec.md`)

## 0. Default Deny
- All collections default to `allow read, write: if false;`.

## 1. Identity & Access Control
- `isAuthenticated()`: `request.auth != null`
- `isOwner(userId)`: `isAuthenticated() && request.auth.uid == userId`
- `isAdmin()`: `isAuthenticated() && ((request.auth.token.email == "foysalnazmul2@gmail.com" && request.auth.token.email_verified == true) || (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'))`

## 2. Collections & Rules
- `/users/{userId}`:
  - Read: `isOwner(userId) || isAdmin()`
  - Create: `isOwner(userId) && validUserProfile(request.resource.data) && (request.resource.data.role == 'user' || isAdmin())`
  - Update: `isOwner(userId) && validUserProfile(request.resource.data) && request.resource.data.uid == resource.data.uid && request.resource.data.createdAt == resource.data.createdAt && (request.resource.data.role == resource.data.role || isAdmin())`
  - Delete: `isAdmin()`
- `/deployments/{deploymentId}`:
  - Read: `isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isAdmin())`
  - Create: `isAuthenticated() && request.resource.data.ownerUid == request.auth.uid && validDeploymentRecord(request.resource.data)`
  - Update: `isAuthenticated() && resource.data.ownerUid == request.auth.uid && request.resource.data.ownerUid == resource.data.ownerUid && request.resource.data.createdAt == resource.data.createdAt && validDeploymentRecord(request.resource.data)`
  - Delete: `isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isAdmin())`
- `/transactions/{transactionId}`:
  - Read: `isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isAdmin())`
  - Create: `isAuthenticated() && request.resource.data.ownerUid == request.auth.uid && validTransactionRecord(request.resource.data)`
  - Update: `false` (immutable financial ledger)
  - Delete: `isAdmin()`
- `/walletTokens/{tokenId}`:
  - Read: `isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isAdmin())`
  - Create: `isAuthenticated() && request.resource.data.ownerUid == request.auth.uid && validWalletTokenRecord(request.resource.data)`
  - Update: `isAuthenticated() && resource.data.ownerUid == request.auth.uid && request.resource.data.ownerUid == resource.data.ownerUid && validWalletTokenRecord(request.resource.data)`
  - Delete: `isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isAdmin())`
- `/bioTargets/{targetId}`:
  - Read: `isAuthenticated()` (authenticated scientists/users can browse registered DeSci Bio-IP targets)
  - Create: `isAuthenticated() && request.resource.data.ownerUid == request.auth.uid && validBioTargetRecord(request.resource.data)`
  - Update: `isAuthenticated() && resource.data.ownerUid == request.auth.uid && request.resource.data.ownerUid == resource.data.ownerUid && request.resource.data.createdAt == resource.data.createdAt && validBioTargetRecord(request.resource.data)`
  - Delete: `isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isAdmin())`
- `/gameScores/{scoreId}`:
  - Read: `true` (public leaderboard for NovaGuard 3D Defense)
  - Create: `isAuthenticated() && request.resource.data.ownerUid == request.auth.uid && validGameRunScore(request.resource.data)`
  - Update: `isAuthenticated() && resource.data.ownerUid == request.auth.uid && request.resource.data.ownerUid == resource.data.ownerUid && request.resource.data.createdAt == resource.data.createdAt && validGameRunScore(request.resource.data)`
  - Delete: `isAdmin()`
