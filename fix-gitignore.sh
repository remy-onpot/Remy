#!/bin/bash
# 🔧 Git Cleanup Script - Fix .gitignore Issues
# Run this to remove unwanted files from git tracking

set -e

echo "🔄 Cleaning up Git repository..."
echo ""

# Navigate to repo root
cd /workspaces/Remy

# 1. Remove node_modules from git tracking
echo "📦 Removing node_modules from git tracking..."
git rm -r --cached app/node_modules/ 2>/dev/null || echo "✅ node_modules already removed or not tracked"

# 2. Remove root package-lock.json if exists
echo "📄 Removing root package-lock.json from git tracking..."
git rm --cached package-lock.json 2>/dev/null || echo "✅ Root package-lock.json not tracked"

# 3. Remove .env.local if committed (CRITICAL!)
echo "🔒 Removing .env.local from git tracking..."
git rm --cached .env.local 2>/dev/null || echo "✅ .env.local not tracked (good!)"

# 4. Remove app/.env.local if exists
echo "🔒 Removing app/.env.local from git tracking..."
git rm --cached app/.env.local 2>/dev/null || echo "✅ app/.env.local not tracked"

# 5. Remove any .next build artifacts
echo "🏗️  Removing build artifacts from git tracking..."
git rm -r --cached app/.next/ 2>/dev/null || echo "✅ .next not tracked"

# 6. Add all .gitignore changes
echo "📝 Staging .gitignore files..."
git add .gitignore app/.gitignore 2>/dev/null || true

# 7. Show status
echo ""
echo "✅ Cleanup complete! Current status:"
git status --short | head -30

echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Review the changes above"
echo "2. Commit the cleanup:"
echo "   git commit -m 'chore: fix .gitignore and remove tracked build artifacts'"
echo "3. Push to remote:"
echo "   git push origin main"
echo ""
echo "🔒 SECURITY NOTE:"
echo "If .env.local was previously committed, it's still in git history!"
echo "To completely remove it, you'll need to use git filter-repo or BFG:"
echo "   https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository"
