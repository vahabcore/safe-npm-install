# Contributing to safe-npm-install

We welcome contributions. Whether it's a bug fix, a new detection signal, or a documentation improvement — it all helps.

Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/vahabcore/safe-npm-install.git
cd safe-npm-install

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Project Structure

```
src/
  cli.ts         CLI entry point
  index.ts       Public API exports
  fetcher.ts     npm registry data fetching
  analyzer.ts    Signal extraction from raw data
  scorer.ts      Risk scoring engine
  reporter.ts    CLI output formatting
  cache.ts       File-based cache
  types.ts       TypeScript type definitions
tests/
  scorer.test.ts
  analyzer.test.ts
```

## Guidelines

### Code Style

- TypeScript strict mode
- ESM modules
- Run `npm run lint` and `npm run format` before committing

### Commits

- Use clear, descriptive commit messages
- One logical change per commit

### Pull Requests

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Run `npm test` and `npm run lint`
6. Push and open a PR

### Testing

- All new features must include tests
- Maintain >= 80% test coverage
- Run `npm run test:coverage` to check

### What to Contribute

- New security signals
- Scoring algorithm improvements
- Install script analysis
- Bug fixes
- Documentation
- Performance improvements

Check [Issues](../../issues) for `good first issue` labels.

## Code of Conduct

Be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).
