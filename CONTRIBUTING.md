# Contributing to Kibana Auth Middleware

Thank you for your interest in contributing!  
This guide explains how to propose changes, report bugs, and submit improvements to the project.

---

## 🧩 Types of Contributions

- Bug fixes
- New features or enhancements
- Test coverage improvements
- Documentation updates
- Performance optimizations

---

## 🐛 Reporting Bugs

Please open an issue and include:

- Steps to reproduce the bug
- What you expected to happen
- What actually happened
- Any relevant logs or screenshots
- Versions of Kibana, Elasticsearch, Node.js, and the middleware

---

## ✨ Proposing Features

To suggest a feature, open an issue with:

- A clear and descriptive title
- The motivation or use case
- Any proposed behavior or alternatives

---

## 🧪 Development Workflow

1. Fork this repository and clone your fork:
   ```bash
   git clone https://github.com/alexsanderp/kibana-auth-middleware.git
   cd kibana-auth-middleware
   ```

2. Create a new branch for your changes:

   - For new features:
     ```bash
     git checkout -b feature/my-feature
     ```
   - For bug fixes:
     ```bash
     git checkout -b bugfix/my-bugfix
     ```

3. Enter the `src` directory to run npm commands:
   ```bash
   cd src
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Create and configure your `.env` file based on `.env.example` inside the `src` directory.

6. **Testing without oauth2-proxy**:

   To test the middleware locally without running oauth2-proxy, use a browser extension like [ModHeader](https://modheader.com/) to inject the header:

   ```
   x-forwarded-email: your-email@example.com
   ```

7. Run the application:
   ```bash
   npm start
   ```

8. Run tests:
   ```bash
   npm test
   ```

9. Check test coverage:
   ```bash
   npm run test:coverage
   ```

> **Note:** We aim for **100% test coverage**. Please ensure your changes are fully tested. Pull requests that reduce coverage may be declined.

---

## ✅ Submitting a Pull Request

- Make sure all tests pass
- Maintain 100% test coverage
- Follow consistent code style (Prettier is used)
- Use clear, conventional commit messages:
  - `feat: add support for role mapping`
  - `fix: handle invalid email header`
  - `test: improve coverage for auth flow`

Open a pull request against the `main` branch and describe your changes clearly. Reference any related issues when applicable.

---

## 🙌 Thank You

Your contributions — big or small — help improve this project for everyone. Thank you!