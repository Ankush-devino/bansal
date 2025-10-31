# Forensic Department Interface - Database Setup Guide

## Overview

This application uses PostgreSQL as the primary database for storing forensic case data, evidence information, biometric analysis results, and blockchain audit trails.

## Prerequisites

- PostgreSQL 12+ installed and running
- psql command-line tool
- Administrator access to PostgreSQL

## Initial Setup

### 1. Create Database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create the database
CREATE DATABASE forensic_db;

# Create a dedicated user (optional, for security)
CREATE USER forensic_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE forensic_db TO forensic_user;

# Exit psql
\q
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forensic_db
DB_USER=postgres
DB_PASSWORD=postgres
```

Or use the dedicated user:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forensic_db
DB_USER=forensic_user
DB_PASSWORD=your_secure_password
```

### 3. Initialize Database Schema

The application automatically initializes the database schema on startup. The following tables are created:

#### Cases Table
- Stores case information and metadata
- Tracks case status, priority, and assignment
- Indexes on status and assigned_to for fast queries

#### Evidence Table
- Stores evidence details and analysis results
- Links evidence to cases
- Tracks IPFS and blockchain hashes

#### Officers Table
- Stores forensic officer information
- Tracks specialization, success rate, and workload
- Supports smart case assignment system

#### Case Assignments Table
- Junction table linking cases to officers
- Tracks match scores and assignment status
- Maintains audit history

#### Biometric Results Table
- Stores multi-modal biometric analysis results
- Tracks confidence scores for each modality
- Records consensus results and verification status

#### Reports Table
- Stores generated forensic reports
- Tracks AI generation and expert review status
- Links to source cases

#### Audit Trail Table
- Blockchain-ready audit logging
- Records all case and evidence modifications
- Stores blockchain hashes and signatures for tamper-proof history

#### Pattern Matches Table
- Stores cross-case pattern analysis results
- Enables identification of serial offender patterns
- Links similar cases for investigation

## Database Schema

### Cases
```sql
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  priority VARCHAR(50) DEFAULT 'Medium',
  assigned_to VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  resolution_time_days INT,
  evidence_count INT DEFAULT 0
);
```

### Evidence
```sql
CREATE TABLE evidence (
  id SERIAL PRIMARY KEY,
  evidence_id VARCHAR(50) UNIQUE NOT NULL,
  case_id VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Pending Analysis',
  uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by VARCHAR(255),
  analysis_status VARCHAR(50),
  confidence_score DECIMAL(5,2),
  ipfs_hash VARCHAR(255),
  blockchain_hash VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id)
);
```

### Officers
```sql
CREATE TABLE officers (
  id SERIAL PRIMARY KEY,
  officer_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255),
  caseload INT DEFAULT 0,
  success_rate DECIMAL(5,2),
  location VARCHAR(255),
  experience_years INT,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  active BOOLEAN DEFAULT true,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Biometric Results
```sql
CREATE TABLE biometric_results (
  id SERIAL PRIMARY KEY,
  result_id VARCHAR(50) UNIQUE NOT NULL,
  case_id VARCHAR(50) NOT NULL,
  evidence_id VARCHAR(50),
  suspect_id VARCHAR(50),
  suspect_name VARCHAR(255),
  match_score DECIMAL(5,2),
  consensus_result VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  fingerprint_confidence DECIMAL(5,2),
  facial_confidence DECIMAL(5,2),
  iris_confidence DECIMAL(5,2),
  voice_confidence DECIMAL(5,2),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id)
);
```

### Audit Trail
```sql
CREATE TABLE audit_trail (
  id SERIAL PRIMARY KEY,
  entry_id VARCHAR(50) UNIQUE NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor VARCHAR(255),
  target_type VARCHAR(50),
  target_id VARCHAR(50),
  details TEXT,
  block_hash VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  signature VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Backup and Restore

### Create a Backup

```bash
pg_dump -U postgres forensic_db > forensic_db_backup.sql
```

### Restore from Backup

```bash
psql -U postgres forensic_db < forensic_db_backup.sql
```

## Performance Optimization

The following indexes are automatically created:

- `idx_cases_status` - For filtering cases by status
- `idx_cases_assigned_to` - For officer workload queries
- `idx_evidence_case_id` - For case evidence lookups
- `idx_evidence_type` - For evidence type filtering
- `idx_biometric_case_id` - For biometric analysis queries
- `idx_reports_case_id` - For case report lookups
- `idx_audit_timestamp` - For audit trail timeline queries

## Monitoring

### Check Database Size

```bash
psql -U postgres -d forensic_db -c "SELECT pg_size_pretty(pg_database_size('forensic_db'));"
```

### View Table Sizes

```bash
psql -U postgres -d forensic_db -c "
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Check Connection Count

```bash
psql -U postgres -d forensic_db -c "SELECT count(*) FROM pg_stat_activity;"
```

## Troubleshooting

### Connection Refused

- Ensure PostgreSQL is running: `sudo service postgresql status`
- Check credentials in `.env` file
- Verify host and port are correct

### Permission Denied

- Grant privileges to user: `GRANT ALL PRIVILEGES ON DATABASE forensic_db TO forensic_user;`
- Restart PostgreSQL: `sudo service postgresql restart`

### Slow Queries

- Analyze query plans: `EXPLAIN ANALYZE SELECT ...`
- Create additional indexes if needed
- Consider table partitioning for large datasets

## Future Enhancements

The database schema is designed to support:

1. **Blockchain Integration** - audit_trail table stores blockchain hashes
2. **IPFS Storage** - evidence table tracks IPFS content hashes
3. **Federated Learning** - model version control and training metadata
4. **Real-time Collaboration** - support for concurrent evidence analysis
5. **Advanced Analytics** - pattern matching and predictive modeling

## Security Considerations

1. **User Permissions**: Create dedicated database user with minimal privileges
2. **Connection Pooling**: Use connection pooling in production
3. **Encryption**: Enable SSL/TLS for database connections
4. **Backups**: Regular automated backups to secure storage
5. **Audit Logging**: All modifications are logged in audit_trail table

## Sample Data

The application automatically inserts sample data on first run:
- 3 sample officers with different specializations
- 2 sample cases with different statuses
- Use this data for testing and development

## Next Steps

1. Run `npm install` to install dependencies
2. Create `.env` file with database credentials
3. Start the development server with `npm run dev`
4. The database schema will be automatically initialized
5. Access the application at `http://localhost:5173`
