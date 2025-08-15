#!/bin/bash

# Build the project
cd gm-tool
npm run build

# Create a temporary directory for deployment
cd ..
rm -rf deploy
mkdir deploy
cp -r gm-tool/dist/* deploy/

# Create a simple index.html in the root for the redirect
cat > deploy/index.html << 'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=./" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting…</title>
</head>
<body>
  <p>Redirecting to <a href="./">Cyberpunk RED GM Tool</a>…</p>
</body>
</html>
EOF

# Deploy to gh-pages branch
git add deploy/
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix deploy origin gh-pages

echo "Deployment complete! Your site should be available at:"
echo "https://mrblu03.github.io/CyberpunkRED_Encounter_Tracker/"
