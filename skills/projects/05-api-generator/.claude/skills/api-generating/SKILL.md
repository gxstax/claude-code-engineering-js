---
name: api-documenting
description: Generate API documentation from code. Use when the user wants to document APIs, create API reference, generate endpoint documentation, or needs help with OpenAPI/Swagger specs.
allowed-tools:
 - Read
 - Grep
 - Glob
 - Write
 - Bash(python:*)
 - Bash(./scripts/*:*)
---

# API Documentation Generator

Generate comprehensive API documentation from source code.

## Quick Reference

| Task | Resource |
|------|----------|
| Identify framework | See `PATTERNS.md` |
| Documentation standards | See `STANDARDS.md` |
| Example outputs | See `EXAMPLES.md` |

## Process

### Step 1: Identify API Endpoints

Look for route definitions. For framework-specific patterns, see `PATTERNS.md`.

### Step 2: Extract Information

For each endpoint, extract:
- HTTP method (GET, POST, PUT, DELETE, etc.)
- Path/route
- Parameters (path, query, body)
- Request/response schemas
- Authentication requirements

### Step 3: Generate Documentation

Use the template in `templates/endpoint.md` for each endpoint.

### Step 4: Create Overview

Generate an index using `templates/index.md`.

## Output Formats

### Markdown (Default)
Generate markdown suitable for README or docs site.

### OpenAPI/Swagger
If requested, generate OpenAPI 3.0 spec. See `templates/openapi.yaml`.


## Automation

To auto-detect routes:
```bash
python scripts/detect_routes.py
```