# Git Workflow Guide for PawPals Project

## Table of Contents
1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Branching Strategy](#branching-strategy)
4. [Commit Message Conventions](#commit-message-conventions)
5. [Pull Request Process](#pull-request-process)
6. [Release Management](#release-management)
7. [Multi-Component Development](#multi-component-development)
8. [Collaborative Development Best Practices](#collaborative-development-best-practices)
9. [Emergency Procedures](#emergency-procedures)
10. [Automated Workflows](#automated-workflows)

## Overview

This guide establishes Git workflows for PawPals, a multi-component project consisting of:
- **Mobile App** (`PawPalsMobile/`): React Native with Expo
- **Backend API** (`backend/`): Node.js/Express with MongoDB
- **Legacy Frontend** (`frontend/`): Capacitor-based (maintenance mode)

Our workflow prioritizes stability, code quality, and efficient collaboration while supporting parallel development across multiple components.

## Repository Structure

```
PawPals/
├── PawPalsMobile/          # Primary mobile app
├── backend/                # API server
├── frontend/               # Legacy web app (maintenance)
├── PawPalsMobile2/         # Development/testing branch
└── docs/                   # Project documentation
```

## Branching Strategy

### GitFlow-Based Strategy with Component Awareness

We use a modified GitFlow strategy optimized for multi-component development:

```
main (production-ready code)
├── develop (integration branch)
├── feature/mobile/<feature-name>
├── feature/backend/<feature-name>
├── feature/fullstack/<feature-name>
├── hotfix/<fix-name>
├── release/<version>
└── experimental/<experiment-name>
```

### Branch Types and Naming Conventions

#### 1. Main Branches

**`main`** - Production-ready code
- Always deployable
- Protected branch requiring PR reviews
- Tagged for releases
- Direct pushes forbidden

**`develop`** - Integration branch
- Latest development changes
- Feature branches merge here first
- Continuous integration testing
- Source for release branches

#### 2. Feature Branches

**Component-Specific Features:**
```bash
feature/mobile/user-authentication
feature/mobile/dog-profile-management
feature/backend/push-notifications
feature/backend/garden-analytics
feature/fullstack/event-registration
```

**Cross-Component Features:**
```bash
feature/fullstack/real-time-chat
feature/fullstack/payment-integration
```

**Branch Creation:**
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/mobile/dog-profile-management

# Push to remote and set upstream
git push -u origin feature/mobile/dog-profile-management
```

#### 3. Hotfix Branches

```bash
hotfix/critical-security-fix
hotfix/mobile-crash-fix
hotfix/api-memory-leak
```

**Hotfix Process:**
```bash
# Create from main for critical production fixes
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# After fix, merge to both main and develop
git checkout main
git merge hotfix/critical-security-fix
git tag -a v1.2.1 -m "Hotfix: Critical security vulnerability"
git push origin main --tags

git checkout develop
git merge hotfix/critical-security-fix
git push origin develop
```

#### 4. Release Branches

```bash
release/v1.3.0
release/v2.0.0-beta
```

**Release Process:**
```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.3.0

# Version bumps, final testing, documentation updates
# Merge to main when ready
git checkout main
git merge release/v1.3.0
git tag -a v1.3.0 -m "Release v1.3.0: New gamification features"
git push origin main --tags

# Merge back to develop
git checkout develop
git merge release/v1.3.0
git push origin develop
```

## Commit Message Conventions

### Conventional Commits Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification with component prefixes:

```
<component>: <type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Component Prefixes

- `mobile:` - React Native app changes
- `backend:` - API server changes  
- `web:` - Legacy frontend changes
- `docs:` - Documentation updates
- `ci:` - CI/CD pipeline changes
- `infra:` - Infrastructure/deployment changes

### Commit Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring without feature changes
- `perf` - Performance improvements
- `test` - Test additions or modifications
- `build` - Build system or dependency changes
- `ci` - CI/CD configuration changes
- `chore` - Maintenance tasks

### Examples

```bash
mobile: feat(auth): add Google OAuth integration

Implements Google OAuth login flow with proper token handling
and user profile synchronization.

- Add Google Sign-In SDK integration
- Implement secure token storage
- Add profile picture sync from Google account
- Update login screen with Google button

Closes #123

backend: fix(api): resolve memory leak in WebSocket connections

Fix improper cleanup of WebSocket event listeners causing
memory accumulation over time.

- Add proper event listener cleanup in disconnect handler
- Implement connection heartbeat mechanism
- Add monitoring for active connection count

Fixes #145

mobile: perf(ui): optimize garden list rendering performance

Improve scroll performance for large garden lists by implementing
virtualization and image lazy loading.

- Add FlatList virtualization for garden cards
- Implement progressive image loading
- Add placeholder components for loading states
- Reduce bundle size by optimizing image assets

Performance improvement: 60% faster rendering for 100+ gardens

docs: update API documentation for v1.3 endpoints

fullstack: feat(events): implement real-time event updates

- Mobile: Add WebSocket event listeners
- Backend: Implement event broadcasting
- Update event models for real-time fields

ci: add automated testing for mobile builds
```

### Commit Message Guidelines

1. **Imperative mood**: "Add feature" not "Added feature"
2. **Lowercase**: Start with lowercase letter
3. **No period**: Don't end with a period
4. **50 characters**: Keep subject line under 50 characters
5. **Body wrapping**: Wrap body at 72 characters
6. **Issue references**: Include issue numbers when applicable

## Pull Request Process

### PR Template

Create `.github/pull_request_template.md`:

```markdown
## Summary
Brief description of changes and motivation.

## Type of Change
- [ ] 🚀 New feature (mobile)
- [ ] 🚀 New feature (backend)
- [ ] 🚀 New feature (fullstack)
- [ ] 🐛 Bug fix
- [ ] 📚 Documentation update
- [ ] 🔧 Code refactoring
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test addition/modification

## Components Affected
- [ ] Mobile app (`PawPalsMobile/`)
- [ ] Backend API (`backend/`)
- [ ] Legacy frontend (`frontend/`)
- [ ] Documentation
- [ ] CI/CD

## Testing
### Mobile Testing
- [ ] iOS simulator testing completed
- [ ] Android simulator testing completed
- [ ] Physical device testing (if applicable)
- [ ] Expo Go testing completed

### Backend Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] API endpoint testing completed
- [ ] Database migration testing (if applicable)

### Cross-Component Testing
- [ ] Mobile-Backend integration verified
- [ ] WebSocket functionality tested
- [ ] Push notifications tested (if applicable)
- [ ] Authentication flow verified

## Breaking Changes
List any breaking changes and migration steps.

## Screenshots/Videos
Add visual evidence for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.log statements left
- [ ] Environment variables documented
- [ ] Security implications considered
```

### Review Process

#### Reviewer Assignment Rules

1. **Mobile Changes**: Assign mobile developer + 1 other
2. **Backend Changes**: Assign backend developer + 1 other  
3. **Fullstack Changes**: Assign both mobile and backend developers
4. **Critical Changes**: Require tech lead approval
5. **Security Changes**: Require security review

#### Review Checklist

**Code Quality:**
- [ ] Code is readable and well-documented
- [ ] No hardcoded values or secrets
- [ ] Error handling implemented appropriately
- [ ] Logging added for debugging

**Mobile-Specific:**
- [ ] NativeWind styles follow design system
- [ ] Performance implications considered
- [ ] iOS/Android compatibility verified
- [ ] Expo SDK compatibility maintained

**Backend-Specific:**
- [ ] API endpoints follow REST conventions
- [ ] Database queries optimized
- [ ] Authentication/authorization proper
- [ ] Input validation implemented

**Testing:**
- [ ] Adequate test coverage
- [ ] Edge cases considered
- [ ] Integration points tested
- [ ] Error scenarios tested

#### PR Status Labels

- `status: ready-for-review` - Ready for initial review
- `status: changes-requested` - Needs author updates
- `status: approved` - Approved, ready to merge
- `status: blocked` - Blocked by external dependency
- `component: mobile` - Mobile app changes
- `component: backend` - Backend changes
- `component: fullstack` - Cross-component changes
- `priority: critical` - Critical bug fix
- `priority: high` - High priority feature
- `size: small` - Small change (<100 lines)
- `size: large` - Large change (>500 lines)

### Merge Strategy

**Squash and Merge** (Preferred)
- Use for feature branches
- Creates clean, linear history
- Preserves meaningful commit messages

**Merge Commit**
- Use for release branches
- Preserves branch context
- Better for tracking feature integration

**Rebase and Merge**
- Use for small, atomic changes
- Maintains individual commit history
- Best for hotfixes

## Release Management

### Versioning Strategy

We use **Semantic Versioning (SemVer)** with component-specific considerations:

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Example: v2.1.3-beta.2
```

**Version Increment Rules:**
- **MAJOR**: Breaking API changes, major mobile app overhauls
- **MINOR**: New features, non-breaking API additions
- **PATCH**: Bug fixes, security patches, minor improvements

### Release Types

#### 1. Mobile App Releases

**App Store Releases:**
```bash
# Production release
v2.1.0 - App Store deployment
v2.1.0-ios - iOS-specific build
v2.1.0-android - Android-specific build

# Beta testing
v2.1.0-beta.1 - Internal testing
v2.1.0-rc.1 - Release candidate
```

**Expo Updates (OTA):**
```bash
# Over-the-air updates for non-native changes
ota-2.1.1 - Critical bug fix
ota-2.1.2 - Minor UI improvements
```

#### 2. Backend API Releases

```bash
# API versioning
api-v1.2.0 - Stable API release
api-v1.3.0-beta - Beta API features
```

#### 3. Coordinated Releases

For features requiring both mobile and backend changes:

```bash
# Synchronized releases
v2.1.0-mobile + api-v1.3.0 - Chat feature release
v2.2.0-mobile + api-v1.4.0 - Payment integration
```

### Release Process

#### Pre-Release Phase

1. **Version Planning**
   ```bash
   # Create release planning issue
   - Define version number
   - List included features
   - Identify breaking changes
   - Plan rollback strategy
   ```

2. **Feature Freeze**
   ```bash
   # Create release branch
   git checkout develop
   git pull origin develop
   git checkout -b release/v2.1.0
   
   # Update version numbers
   # PawPalsMobile/app.json
   # backend/package.json
   # Update changelogs
   ```

3. **Release Testing**
   ```bash
   # Comprehensive testing phase
   - Regression testing
   - Performance testing  
   - Security testing
   - Device compatibility testing
   - API integration testing
   ```

#### Release Deployment

1. **Mobile App Release**
   ```bash
   # Build production bundles
   cd PawPalsMobile
   expo build:ios --release-channel production
   expo build:android --release-channel production
   
   # Submit to stores
   expo upload:ios
   expo upload:android
   ```

2. **Backend Deployment**
   ```bash
   # Deploy to staging first
   git push staging release/v2.1.0
   
   # Run production deployment
   git checkout main
   git merge release/v2.1.0
   git tag -a v2.1.0 -m "Release v2.1.0"
   git push origin main --tags
   
   # Trigger production deployment
   ```

3. **Post-Release**
   ```bash
   # Merge back to develop
   git checkout develop
   git merge release/v2.1.0
   git push origin develop
   
   # Clean up release branch
   git branch -d release/v2.1.0
   git push origin --delete release/v2.1.0
   
   # Monitor deployment
   # Update documentation
   # Notify stakeholders
   ```

### Changelog Management

Maintain detailed changelogs for each component:

```markdown
# Changelog

## [2.1.0] - 2024-03-15

### Mobile App
#### Added
- Real-time chat functionality
- Push notification system
- Dark mode support
- Hebrew RTL layout

#### Fixed
- Garden map loading performance
- User authentication edge cases
- Memory leaks in image loading

#### Changed
- Updated dog profile UI design
- Improved garden search algorithm

### Backend API
#### Added
- WebSocket support for real-time features
- Push notification service
- New gamification endpoints
- Enhanced security middleware

#### Fixed
- Database connection pooling issues
- Memory leaks in WebSocket connections
- Authentication token refresh logic

### Security
- Updated dependencies with security patches
- Enhanced input validation
- Improved JWT token handling

### Breaking Changes
- API endpoint `/api/v1/users` moved to `/api/v2/users`
- Mobile app requires minimum iOS 13.0
```

## Multi-Component Development

### Cross-Component Feature Development

When developing features that span multiple components:

#### 1. Planning Phase
```bash
# Create epic issue for tracking
Epic: Real-time Chat System

# Break down into component-specific tasks
- mobile: feat(chat): implement chat UI components
- backend: feat(chat): add WebSocket chat server
- backend: feat(chat): create chat message APIs
- mobile: feat(chat): integrate chat with backend
- docs: document chat API endpoints
```

#### 2. Development Coordination

**Feature Branch Strategy:**
```bash
# Create parent feature branch
git checkout develop
git checkout -b feature/fullstack/real-time-chat

# Create component-specific branches
git checkout -b feature/mobile/chat-ui
git checkout feature/fullstack/real-time-chat
git checkout -b feature/backend/chat-api
```

**Development Order:**
1. Backend APIs and models first
2. Mobile integration second
3. End-to-end testing third
4. Documentation last

#### 3. Integration Testing

```bash
# Integration testing checklist
- [ ] Mobile can connect to backend APIs
- [ ] WebSocket connections stable
- [ ] Push notifications working
- [ ] Database migrations successful
- [ ] Authentication flows complete
- [ ] Error handling comprehensive
```

### Dependency Management

#### Mobile Dependencies
```bash
# Track Expo SDK compatibility
# Document native dependency changes
# Test on multiple React Native versions
```

#### Backend Dependencies
```bash
# Track Node.js version compatibility  
# Document database schema changes
# Monitor third-party service integrations
```

### Database Migration Coordination

```bash
# Migration planning
1. Create migration script in backend
2. Test migration on staging database
3. Plan rollback strategy
4. Coordinate mobile app updates
5. Execute migration with monitoring
```

## Collaborative Development Best Practices

### Team Coordination

#### Daily Standups Integration
- Mention branch status and blockers
- Coordinate cross-component dependencies
- Plan integration points

#### Code Review Culture
```bash
# Review assignment strategy
- Auto-assign component owners
- Require cross-component review for fullstack features  
- Include design review for UI changes
- Security review for auth/payment features
```

### Development Environment

#### Local Development Setup
```bash
# Standardized development environment
1. Node.js version management with .nvmrc
2. MongoDB local instance or Docker
3. Expo CLI for mobile development
4. Environment variable templates
5. Development database seeds
```

#### Branch Management
```bash
# Keep branches focused and short-lived
- Maximum 2 week lifespan for feature branches
- Regular rebasing on develop
- Clean up merged branches promptly
```

### Conflict Resolution

#### Merge Conflict Prevention
```bash
# Strategies to minimize conflicts
- Regular rebasing on develop branch
- Communicate file changes in advance
- Use feature flags for incomplete features
- Coordinate database schema changes
```

#### Conflict Resolution Process
```bash
# When conflicts occur
1. Communicate with conflicting contributor
2. Understand the intent of both changes
3. Resolve conflicts preserving both features
4. Test thoroughly after resolution
5. Document resolution in commit message
```

### Code Quality Standards

#### Automated Quality Gates
```bash
# Pre-commit hooks
- ESLint for code style
- Prettier for formatting
- Type checking for TypeScript
- Unit test execution
- Security vulnerability scanning
```

#### Manual Review Standards
```bash
# Code review checklist
- Architectural consistency
- Performance implications
- Security considerations
- Documentation completeness
- Test coverage adequacy
```

## Emergency Procedures

### Production Hotfixes

#### Critical Bug Response
```bash
# Immediate response protocol
1. Create hotfix branch from main
2. Implement minimal fix
3. Test fix thoroughly
4. Deploy to production immediately
5. Merge to develop
6. Communicate to team
```

#### Rollback Procedures
```bash
# Mobile app rollback
- Revert to previous Expo release channel
- Push emergency OTA update
- Communicate with app stores if needed

# Backend rollback  
- Revert to previous Git tag
- Rollback database migrations if needed
- Monitor system health
```

### Security Incident Response

```bash
# Security incident protocol
1. Assess severity and impact
2. Create emergency hotfix branch
3. Implement security patch
4. Test patch thoroughly
5. Deploy immediately
6. Audit for additional vulnerabilities
7. Document incident and response
8. Update security procedures
```

## Automated Workflows

### GitHub Actions Integration

#### Mobile App CI/CD
```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI/CD

on:
  push:
    branches: [develop, main]
    paths: ['PawPalsMobile/**']
  pull_request:
    branches: [develop]
    paths: ['PawPalsMobile/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: PawPalsMobile/package-lock.json
      
      - name: Install dependencies
        working-directory: ./PawPalsMobile
        run: npm ci
      
      - name: Run tests
        working-directory: ./PawPalsMobile
        run: npm test
      
      - name: Type check
        working-directory: ./PawPalsMobile
        run: npx tsc --noEmit
      
      - name: Lint
        working-directory: ./PawPalsMobile
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Setup Expo
        uses: expo/expo-github-action@v7
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build for production
        working-directory: ./PawPalsMobile
        run: expo build --non-interactive
```

#### Backend CI/CD
```yaml
# .github/workflows/backend-ci.yml
name: Backend CI/CD

on:
  push:
    branches: [develop, main]
    paths: ['backend/**']
  pull_request:
    branches: [develop]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret
      
      - name: Run security audit
        working-directory: ./backend
        run: npm audit

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        # Add your deployment steps here
        run: echo "Deploying to production..."
```

#### Quality Gates
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
    branches: [develop, main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Check commit messages
        run: |
          # Validate conventional commit format
          git log --format="%s" origin/develop..HEAD | while read commit; do
            if \! echo "$commit" | grep -qE '^(mobile|backend|web|docs|ci|infra): (feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?: .+'; then
              echo "Invalid commit message: $commit"
              exit 1
            fi
          done
      
      - name: Check for large files
        run: |
          # Prevent large files from being committed
          find . -type f -size +10M -not -path "./.git/*" -not -path "./node_modules/*" | while read file; do
            echo "Large file detected: $file"
            exit 1
          done
      
      - name: Security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: security-scan-results.sarif
```

### Branch Protection Rules

```bash
# Configure branch protection for main and develop
Branch protection settings:
- Require pull request reviews (2 reviewers minimum)
- Require status checks to pass before merging
- Require up-to-date branches before merging
- Require conversation resolution before merging
- Restrict pushes to admins only
- Allow force pushes: false
- Allow deletions: false
```

### Automated Release Notes

```bash
# Generate release notes automatically
- Parse conventional commit messages
- Group changes by component and type
- Include breaking changes prominently
- Add contributor acknowledgments
- Generate upgrade instructions
```

## Conclusion

This Git workflow guide provides a comprehensive framework for managing the PawPals multi-component project. The key principles are:

1. **Component Awareness**: Clear separation and coordination between mobile and backend development
2. **Quality First**: Automated testing and review processes ensure high code quality
3. **Stability**: Protected branches and careful release management prevent production issues
4. **Collaboration**: Clear processes and communication channels support team productivity
5. **Flexibility**: Procedures accommodate both planned features and emergency fixes

Regular review and adaptation of these processes ensures they continue to serve the project's evolving needs while maintaining the high standards required for a production mobile application and API service.

---

**Document Version**: 1.0  
**Last Updated**: 2024-03-15  
**Next Review**: 2024-06-15
EOF < /dev/null