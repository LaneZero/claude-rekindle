# راهنمای Git و GitHub

مخزن پیشنهادی: `LaneZero/claude-rekindle`. پیش از اولین Push، مخزن خالی را در GitHub بسازید (بدون README، License یا .gitignore خودکار).

```powershell
# After extracting this package, go to the project folder.
cd C:\Projects\claude-rekindle
npm run check

git init -b main
git config user.name "LaneZero"
# Configure your own verified email globally, or use GitHub's no-reply email.
git add .
git commit -m "chore: initialize cross-browser AutoResume monorepo"
git remote add origin https://github.com/LaneZero/claude-rekindle.git
git push -u origin main

git switch -c develop
git push -u origin develop

git switch -c feature/dom-fixture-tests
# Make changes, then:
git add .
git commit -m "test: add browser DOM fixtures"
git push -u origin feature/dom-fixture-tests
```

Open a Pull Request from `feature/dom-fixture-tests` into `develop`; check CI before merge. When ready, merge `develop` into `main` via PR, then tag a tested release:

```powershell
git switch main
git pull --ff-only origin main
git tag -a v2.4.0-beta.1 -m "Cross-browser engineering baseline"
git push origin v2.4.0-beta.1
```

**Important:** The package is not already on GitHub. `git push` requires your GitHub authentication and repository write access. Never commit credentials or cookies.
