# Testing

## Frontend Testing
- **Framework**: Vitest
- **E2E Testing**: Puppeteer (`^25.9.0`)
- **Location**: Tests are likely located alongside components or in a dedicated `tests/` or `cypress/` directory depending on setup.

To run tests:
```bash
npm run test
```

## Backend / Slicer Service Testing
- **Framework**: Pytest (standard for Python/FastAPI, though not explicitly listed in stack, it is the convention).
- Needs verification on specific test directory structure within `slicer-service/`.

*TODO: Needs verification on exact test running commands and coverage for backend.*
