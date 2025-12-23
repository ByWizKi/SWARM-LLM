# GitHub Collaboration Rules

## Purpose

This document defines the rules for collaborating on this project using GitHub.
Its goal is to ensure **code quality**, **clear communication**, and **conflict-free collaboration** within a team of multiple contributors.

---

## Team Structure

- 4 contributors
- All changes are made via Pull Requests
- The `main` branch is protected

---

## Branching Strategy

### 1. Protected branches

- Direct pushes to `main` are not allowed
- All work must be done in feature branches

---

### 2. Branch naming convention

Branches must follow one of the formats below:

```
feature/<short-description>
fix/<short-description>
docs/<short-description>
refactor/<short-description>
```

Examples:

```
feature/user-authentication
fix/login-bug
docs/update-api-docs
refactor/database-layer
```

---

## Development Rules

### 3. One purpose per branch

- A branch must address **one task only**
- Do not mix unrelated changes (e.g. feature + refactor)

---

### 4. Keep branches up to date

Before starting work and before opening a Pull Request:

```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
```

---

### 5. Commit guidelines

- Commits must be small and meaningful
- Commit messages must be clear and written in English

Example:

```
Add validation for user input
Fix API error handling
```

---

## Pull Request Rules

### 6. Pull Requests are mandatory

Every change must go through a Pull Request:

- No direct merges to `main`
- No self-merging without review

---

### 7. Pull Request requirements

Each Pull Request must:

- Have a clear title and description
- Explain what was changed and why
- Be reviewed by at least one other contributor
- Pass all automated checks (if applicable)

---

### 8. Scope control

- Avoid large Pull Requests
- Split large changes into multiple PRs when possible

---

## Conflict Management

### 9. Preventing conflicts

- Communicate before working on the same files or features
- Pull and merge `main` regularly
- Avoid long-lived branches

---

### 10. Resolving conflicts

If a merge conflict occurs:

1. Stop pushing changes
2. Inform the team
3. One contributor resolves the conflict
4. The resolution must be reviewed before merging

---

## Code Quality Standards

### 11. Code ownership and responsibility

- The author of a change is responsible for its quality
- Reviewers are responsible for catching issues and inconsistencies

---

### 12. Documentation updates

- Any functional change must include documentation updates if needed
- Documentation changes must follow the same review process as code

---

## Rules for New Contributors

### 13. Onboarding process

New contributors must:

- Read this document before contributing
- Start with small, well-defined tasks
- Ask questions if something is unclear
- Never push directly to `main`

---

## Summary

- Use branches for all work
- Keep changes focused and small
- Always use Pull Requests
- Require peer review
- Keep branches synchronized
- Communicate early to avoid conflicts
