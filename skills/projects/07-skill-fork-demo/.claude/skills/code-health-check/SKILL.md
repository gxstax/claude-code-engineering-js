---
name: code-health-check
description: Perform a comprehensive code health check on a directory.
context: fork # ← 关键：在隔离子代理中执行
agent: general-purpose # ← 子代理类型
allowed-tools: [Read, Grep, Glob] # ← 只读，不修改代码
---

# Code Health Check Skill

Analyze the codebase at `$ARGUMENTS` and produce a structured health report.

## Checks to Perform
1. File Organization - 文件大小、目录结构
2. Error Handling - try/catch、错误传播
3. Security Basics - 硬编码密钥、eval()、SQL 注入
4. Code Quality - 重复代码、未使用变量

## Output Format

Return a structured report:
- Overall health score (A/B/C/D/F)
- Issues found (categorized by severity: CRITICAL/WARNING/INFO)
- Top 3 recommendations
