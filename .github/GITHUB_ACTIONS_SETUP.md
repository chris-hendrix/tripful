# GitHub Actions CI/CD Setup

This repository uses GitHub Actions for continuous integration and deployment. The CI workflow automatically runs quality checks, tests, and E2E tests on every push and pull request.

## Features

✅ **Smart Path Filtering** - Only runs tests for changed code
✅ **Full Suite on Main** - Ensures production quality
✅ **Turborepo Optimization** - Caches build outputs for faster runs
✅ **Playwright E2E Tests** - Automated browser testing
✅ **PostgreSQL Service** - Tests run against real database
✅ **Concurrency Control** - Cancels outdated runs automatically

## Workflow Overview

### Jobs

1. **Detect Changes** - Identifies which packages changed
2. **Quality Checks** - Runs ESLint and TypeScript checks
3. **Unit Tests** - Runs API unit tests (if API changed)
4. **E2E Tests** - Runs Playwright tests (if API/web changed)

### Conditional Execution

**On Pull Requests:**

- Only affected packages are linted/typechecked (`--affected` flag)
- Unit tests run only if `apps/api/**` changed
- E2E tests run only if `apps/api/**` or `apps/web/**` changed

**On Main Branch:**

- Full suite always runs (quality gates for production)
- All packages linted and typechecked
- All tests run regardless of changes

### Path Filters

Changes in these paths trigger specific jobs:

- `apps/api/**` → Unit tests + E2E tests
- `apps/web/**` → E2E tests
- `package.json`, `turbo.json`, configs → All tests

## Setup Instructions

### 1. No Additional Configuration Required

The workflow is ready to use! It will automatically run on:

- Push to `main` or `master` branches
- Pull requests targeting `main` or `master`

### 2. (Optional) Enable Turborepo Remote Caching

For faster builds across team members:

1. Sign up for Vercel (free tier): https://vercel.com
2. Link your repository:
   ```bash
   npx turbo login
   npx turbo link
   ```
3. Add GitHub repository secrets:
   - `TURBO_TOKEN` - Get from Vercel dashboard
   - `TURBO_TEAM` - Your team slug (add as repository variable)

4. Uncomment remote cache env vars in `.github/workflows/ci.yml`:
   ```yaml
   env:
     TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
     TURBO_TEAM: ${{ vars.TURBO_TEAM }}
   ```

**Benefits:**

- 80%+ cache hit rate for unchanged packages
- 3-5x faster CI runs
- Shared cache between developers and CI

### 3. (Optional) Require Status Checks

Protect your main branch by requiring CI to pass:

1. Go to repository **Settings** → **Branches**
2. Add branch protection rule for `main`
3. Enable **Require status checks to pass before merging**
4. Select these required checks:
   - ✅ Quality Checks
   - ✅ Unit Tests
   - ✅ E2E Tests

## CI Performance

**Expected Run Times:**

| Scenario                | Time    | Description                |
| ----------------------- | ------- | -------------------------- |
| PR (API only)           | 3-4 min | Quality + Unit + E2E tests |
| PR (Web only)           | 2-3 min | Quality + E2E tests        |
| PR (No changes to apps) | 1-2 min | Quality checks only        |
| Main branch             | 5-7 min | Full suite always runs     |

**With Remote Cache:**

- PR builds: 1-2 min (most tasks cached)
- Main builds: 3-4 min (selective caching)

## Debugging Failed Builds

### View Logs

1. Go to **Actions** tab in GitHub
2. Click on failed workflow run
3. Click on failed job to see logs

### Download Playwright Reports

1. Scroll to bottom of workflow run
2. Download **playwright-report** artifact
3. Extract and open `index.html` in browser

### Run Locally

Reproduce CI environment locally:

```bash
# Set test environment variables
export TEST_MODE=true
export NODE_ENV=test
export DATABASE_URL=postgresql://tripful:tripful123@localhost:5432/tripful
export JWT_SECRET=test-jwt-secret-minimum-32-characters-long-for-testing-purposes-only

# Start database
pnpm db:up

# Run migrations
pnpm --filter @tripful/api db:migrate

# Run tests
pnpm test
pnpm test:e2e
```

## Cost Estimation

**GitHub Actions Free Tier:**

- Public repos: Unlimited minutes ✅
- Private repos: 2,000 minutes/month

**Estimated Usage:**

- 20 PRs/month × 5 min = 100 minutes/month
- 40 commits to main × 7 min = 280 minutes/month
- **Total: ~380 minutes/month** (well within free tier)

## Workflow File Location

`.github/workflows/ci.yml`

## Troubleshooting

### Playwright Installation Fails

**Solution:** The workflow uses `playwright install --with-deps` which automatically installs Ubuntu dependencies. No action needed.

### Database Connection Fails

**Solution:** The PostgreSQL service includes health checks. Wait for service to be ready before running tests.

### Turbo Cache Not Working

**Solution:**

1. Check `.turbo` directory is cached (should see "Cache restored" in logs)
2. Verify `turbo.json` includes correct task outputs
3. For remote cache, verify `TURBO_TOKEN` is set correctly

### Tests Pass Locally but Fail in CI

**Solution:**

1. Check environment variables match between local and CI
2. Verify database migrations ran successfully
3. Check for timing issues (CI is slower - adjust timeouts)
4. Download Playwright report artifact for details

## Next Steps

1. **Test the workflow**: Create a PR and verify CI runs correctly
2. **Add status badge**: Add CI status badge to README.md
3. **Enable remote cache**: Set up Turborepo remote caching for faster builds
4. **Branch protection**: Require CI checks before merging

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Guide](https://playwright.dev/docs/ci-intro)
- [Turborepo CI Guide](https://turborepo.com/docs/crafting-your-repository/constructing-ci)
- [Full Strategy Document](.thoughts/research/2026-02-03-github-actions-ci-strategy.md)
