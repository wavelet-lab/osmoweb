# GitHub Branch Protection Rules
# This file contains recommended settings for master branch protection
# Settings need to be applied through GitHub UI: Settings > Branches > Add rule

## Recommended settings for master branch:

### Basic rules:
- ✅ Require a pull request before merging
- ✅ Require approvals (minimum 1)
- ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require review from code owners (if CODEOWNERS file exists)

### Status checks:
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

### Required status checks:
- ✅ test (ubuntu-latest, 18.x) - tests on Node.js 18
- ✅ test (ubuntu-latest, 20.x) - tests on Node.js 20  
- ✅ build - build verification

### Additional restrictions:
- ✅ Restrict pushes that create files
- ✅ Require linear history (optional)
- ✅ Include administrators (rules apply to everyone)

### Setup instructions:
1. Go to repository Settings
2. Branches → Add rule
3. Branch name pattern: master (or main)
4. Enable all options mentioned above
5. In "Require status checks to pass" add:
   - test (ubuntu-latest, 18.x)
   - test (ubuntu-latest, 20.x)
   - build
6. Save the rule

## Result:
After setup, merge to master will only be possible:
- Through Pull Request
- After all tests pass
- After approval by at least one reviewer
