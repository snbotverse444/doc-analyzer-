# Repository instructions

## Build and testing

- Install dependencies using the repository's documented package manager.
- Run the complete unit-test suite before creating a pull request.
- Run linting, type checking, and security scanning.
- Never remove or weaken tests to make a build pass.

## Security fixes

- Prefer the smallest safe change that resolves the vulnerability.
- Never suppress, ignore, or dismiss a security alert instead of fixing it.
- Do not expose secrets, credentials, tokens, or private configuration.
- Do not introduce breaking API changes unless strictly required.
- Add or update tests that demonstrate the vulnerability is fixed.
- Clearly document residual risks in the pull request.
