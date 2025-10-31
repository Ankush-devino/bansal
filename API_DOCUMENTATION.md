# Forensic Department Interface - API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API is open. In production, implement JWT-based authentication.

## Common Response Format

All API endpoints return JSON responses in this format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null
}
```

---

## Cases API

### GET /cases
Get all cases with optional filtering

**Query Parameters:**
- `status` (string): Filter by case status (Pending, In Progress, Completed, On Hold)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "case_id": "CASE-2024-001",
      "title": "Breaking and Entering",
      "description": "...",
      "status": "In Progress",
      "priority": "High",
      "assigned_to": "Officer Smith",
      "created_date": "2024-01-20T10:00:00Z",
      "evidence_count": 12
    }
  ]
}
```

### GET /cases/:caseId
Get a specific case

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### POST /cases
Create a new case

**Request Body:**
```json
{
  "title": "Case Title",
  "description": "Case description",
  "priority": "High",
  "assigned_to": "Officer Name",
  "created_by": "Detective Name"
}
```

### PUT /cases/:caseId
Update case details

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "In Progress",
  "priority": "Critical"
}
```

### DELETE /cases/:caseId
Delete a case

### GET /cases/:caseId/stats
Get case statistics

---

## Evidence API

### GET /evidence
Get all evidence with optional filtering

**Query Parameters:**
- `case_id` (string): Filter by case ID
- `type` (string): Filter by evidence type
- `status` (string): Filter by analysis status

**Supported Types:**
- Fingerprint
- Facial Recognition
- DNA
- Digital Forensics
- Iris Scan
- Voice Analysis

### GET /evidence/:evidenceId
Get specific evidence details

### POST /evidence
Upload new evidence

**Request Body:**
```json
{
  "case_id": "CASE-2024-001",
  "type": "Fingerprint",
  "description": "Evidence description",
  "uploaded_by": "Officer Name"
}
```

### PUT /evidence/:evidenceId/analysis
Update evidence analysis results

**Request Body:**
```json
{
  "analysis_status": "Match Found",
  "confidence_score": 99.2,
  "blockchain_hash": "0x..."
}
```

### DELETE /evidence/:evidenceId
Delete evidence record

---

## Officers API

### GET /officers
Get all officers

**Query Parameters:**
- `specialization` (string): Filter by specialization
- `active` (boolean): Filter active/inactive officers

### GET /officers/:officerId
Get officer details

### POST /officers
Create new officer

**Request Body:**
```json
{
  "name": "Officer Name",
  "specialization": "Fingerprint Specialist",
  "email": "officer@police.local",
  "phone": "+1-555-0100",
  "location": "Downtown",
  "experience_years": 8
}
```

### PUT /officers/:officerId
Update officer information

### GET /officers/:officerId/workload
Get officer workload and active cases

---

## Smart Case Assignment API

### GET /assignment/recommendations/:caseId
Get AI-powered officer recommendations for case assignment

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "officer_id": "OFF-0001",
      "name": "Officer Smith",
      "specialization": "Fingerprint Specialist",
      "match_score": 98.5,
      "caseload": 3,
      "success_rate": 94.5,
      "location": "Downtown",
      "experience_years": 8
    }
  ]
}
```

Scores are calculated based on:
- Specialization match (35%)
- Workload balance (25%)
- Success rate (25%)
- Geographic proximity (15%)

### POST /assignment/assign
Assign case to officer

**Request Body:**
```json
{
  "case_id": "CASE-2024-001",
  "officer_id": "OFF-0001",
  "notes": "Assignment notes"
}
```

### GET /assignment
Get all case assignments

**Query Parameters:**
- `case_id` (string)
- `officer_id` (string)
- `status` (string)

### DELETE /assignment/:caseId/:officerId
Unassign case from officer

---

## Biometric Fusion API

### GET /biometric
Get biometric analysis results

**Query Parameters:**
- `case_id` (string): Filter by case
- `verified` (boolean): Filter verified/unverified results

### GET /biometric/:resultId
Get specific biometric analysis result

### POST /biometric
Create new biometric analysis

**Request Body:**
```json
{
  "case_id": "CASE-2024-001",
  "evidence_id": "EV-2024-001",
  "suspect_id": "SUSP-001",
  "suspect_name": "John Doe",
  "fingerprint_confidence": 99.7,
  "facial_confidence": 98.9,
  "iris_confidence": 99.4,
  "voice_confidence": 85.2
}
```

Result includes automatic consensus calculation:
- **95-100%**: Match Confirmed
- **85-95%**: High Confidence Match
- **70-85%**: Partial Match
- **<70%**: No Match

### PUT /biometric/:resultId/verify
Expert verification of biometric result

**Request Body:**
```json
{
  "verified_by": "Expert Name"
}
```

### POST /biometric/consensus/compare
Compare multiple biometric results for consensus

**Request Body:**
```json
{
  "result_ids": ["BIO-2024-001", "BIO-2024-002"]
}
```

---

## Blockchain & Audit Trail API

### GET /blockchain/audit
Get audit trail entries

**Query Parameters:**
- `target_type` (string): Filter by target type (Case, Evidence, etc.)
- `target_id` (string): Filter by specific target

### GET /blockchain/audit/:entryId
Get specific audit entry

### POST /blockchain/record-transaction
Record blockchain transaction

**Request Body:**
```json
{
  "action": "Evidence Uploaded",
  "target_type": "Evidence",
  "target_id": "EV-2024-001",
  "details": "Fingerprint evidence uploaded"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry_id": "AUDIT-...",
    "blockchain_hash": "0x...",
    "signature": "SIG-...",
    "verified": true
  }
}
```

### POST /blockchain/ipfs/store
Store evidence on IPFS

**Request Body:**
```json
{
  "evidence_id": "EV-2024-001",
  "file_hash": "sha256_hash"
}
```

### POST /blockchain/verify-chain-of-custody
Verify evidence chain of custody with AI integrity check

**Request Body:**
```json
{
  "evidence_id": "EV-2024-001"
}
```

### GET /blockchain/stats
Get blockchain statistics

### POST /blockchain/smart-contract/verify
Smart contract verification for expert signatures

**Request Body:**
```json
{
  "result_id": "BIO-2024-001",
  "expert_signatures": ["sig1", "sig2"]
}
```

### POST /blockchain/model-version/record
Record deep learning model version on blockchain

**Request Body:**
```json
{
  "model_name": "FacialRecognitionV2",
  "version": "2.1.0",
  "accuracy": 0.987,
  "training_data_hash": "0x..."
}
```

---

## Analytics API

### GET /analytics/cases/stats
Get case statistics and trends

**Response:**
```json
{
  "success": true,
  "data": {
    "total_cases": 47,
    "by_status": [...],
    "by_priority": [...],
    "average_resolution_days": 12.5,
    "monthly_trend": [...]
  }
}
```

### GET /analytics/evidence/stats
Get evidence analysis statistics

### POST /analytics/patterns/find
AI-powered cross-case pattern matching

**Request Body:**
```json
{
  "case_id": "CASE-2024-001",
  "evidence_type": "Fingerprint",
  "similarity_threshold": 0.75
}
```

### GET /analytics/patterns/:caseId
Get pattern matches for a case

### GET /analytics/officers/performance
Get officer performance analytics

### POST /analytics/predictions/resolution-time
Predictive case resolution timeline

**Request Body:**
```json
{
  "case_id": "CASE-2024-001"
}
```

### GET /analytics/biometrics/stats
Get biometric analysis statistics

---

## Dashboard API

### GET /dashboard/stats
Get dashboard overview statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "total_cases": 47,
    "active_cases": 28,
    "completed_cases": 19,
    "total_evidence": 1283,
    "pattern_matches_today": 23,
    "blockchain_verified_entries": 892,
    "average_resolution_time": 12.5
  }
}
```

---

## Error Handling

### Error Responses

**400 - Bad Request**
```json
{
  "success": false,
  "error": "Missing required field: title"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "error": "Case CASE-2024-999 not found"
}
```

**500 - Server Error**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting. Implement in production based on requirements.

## CORS

CORS is enabled. Configure allowed origins in `.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

## Pagination

Currently not implemented. Can be added to list endpoints using:
- `limit` - Items per page
- `offset` - Number of items to skip

## Sorting

Currently sorted by creation date (newest first). Can be extended with:
- `sort_by` - Field to sort by
- `sort_order` - asc or desc

---

## Testing

### Using curl

```bash
# Get all cases
curl http://localhost:3001/api/cases

# Create a case
curl -X POST http://localhost:3001/api/cases \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Case","priority":"High"}'

# Get biometric recommendations
curl http://localhost:3001/api/assignment/recommendations/CASE-2024-001
```

### Using Postman

Import the base URL `http://localhost:3001/api` into Postman and create requests for each endpoint.

---

## Future Enhancements

1. **Authentication**: JWT-based authentication
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Prevent API abuse
4. **Pagination**: Large dataset handling
5. **Caching**: Redis integration for frequently accessed data
6. **WebSockets**: Real-time collaboration updates
7. **Graphql**: Alternative API layer for flexible queries
8. **API Versioning**: Support multiple API versions
