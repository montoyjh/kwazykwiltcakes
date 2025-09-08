#!/bin/bash

# GitHub Pages Deployment Script for Quilting Grid Planner
# Run this script after creating your GitHub repository

echo "🚀 GitHub Pages Deployment Script"
echo "================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Run 'git init' first."
    exit 1
fi

# Get repository URL from user
echo ""
echo "📝 Please provide your GitHub repository URL:"
echo "   Example: https://github.com/yourusername/quilting-grid-planner.git"
read -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Error: Repository URL is required."
    exit 1
fi

echo ""
echo "🔗 Adding remote repository..."
git remote add origin "$REPO_URL"

echo "📤 Pushing code to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Code pushed successfully!"
echo ""
echo "🌐 Next steps for GitHub Pages:"
echo "1. Go to your repository on GitHub.com"
echo "2. Click on 'Settings' tab"
echo "3. Scroll down to 'Pages' section"
echo "4. Under 'Source', select 'Deploy from a branch'"
echo "5. Select 'main' branch and '/ (root)' folder"
echo "6. Click 'Save'"
echo "7. Wait 2-3 minutes for deployment"
echo "8. Your app will be available at: https://yourusername.github.io/quilting-grid-planner"
echo ""
echo "🎉 Your quilting grid planner will be live on the web!"
