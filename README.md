# Kibana Auth Middleware

A lightweight authentication middleware for Kibana that enables Single Sign-On (SSO) using [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) — a free and simple alternative to the native SSO available only in Kibana's Platinum and Enterprise tiers.

This project is ideal for teams using the free version of Kibana who want to enforce user-based access control via SSO, without giving up Kibana’s native RBAC.

> **Tested with Elasticsearch and Kibana version 9.0.0**

## ✨ Features

- SSO authentication using [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/).
- Seamless integration with Kibana.
- Automatic user provisioning in Elasticsearch.
- Temporary random passwords generated on each login.
- Uses Kibana’s built-in RBAC and user management.
- No paid Elastic licenses required.

## 🚀 How It Works

1. The user authenticates via `oauth2-proxy`, which sets the `x-forwarded-email` header.
2. This middleware intercepts requests to Kibana.
3. If the user has a valid Kibana session cookie (`sid`), the request proceeds.
4. If not:
   - Extracts the email from `x-forwarded-email`
   - Validates the email domain.
   - Checks if the user exists in Elasticsearch:
     - If not: creates a new user with the `viewer` role.
     - If yes: updates the user’s password.
   - Logs in to Kibana using the generated password.
   - Redirects the user with a valid Kibana session cookie.

## 📦 Requirements

- Node.js >= 24
- Elasticsearch and Kibana 9.0.0 (or compatible)
- A properly configured [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) that sets the `x-forwarded-email` header

## ⚙️ Environment Variables

| Variable                | Description                                                             | Required |
|-------------------------|-------------------------------------------------------------------------|----------|
| `KIBANA_TARGET`         | URL of your Kibana instance (e.g. `https://kibana.example.com`)         | Yes      |
| `ELASTIC_TARGET`        | URL of your Elasticsearch instance (e.g. `https://elastic.example.com`) | Yes      |
| `ELASTIC_USER`          | Elasticsearch user with permission to manage users                      | Yes      |
| `ELASTIC_PASS`          | Password for the Elasticsearch user                                     | Yes      |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of allowed email domains (e.g. `example.com`)      | Yes      |
| `ELASTIC_TIMEOUT_MS`    | Timeout for Elasticsearch requests in milliseconds (default: `10000`)   | No       |
| `PORT`                  | Port for the middleware to run on (default: `3000`)                     | No       |

## 📁 Example `.env`

```env
KIBANA_TARGET=https://kibana.example.com
ELASTIC_TARGET=https://elastic.example.com
ELASTIC_USER=elastic
ELASTIC_PASS=your-secure-password
ALLOWED_EMAIL_DOMAINS=example.com
ELASTIC_TIMEOUT_MS=5000
PORT=3000
```

> ⚠️ **Important:** Do not commit your `.env` file to version control. It may contain sensitive information.

## 🌀 Running

> To test the middleware locally without running oauth2-proxy, use a browser extension like [ModHeader](https://modheader.com/) to inject the header: x-forwarded-email: your-email@example.com

### 🧪 Running Locally

```bash
git clone https://github.com/your-org/kibana-auth-middleware.git
cd kibana-auth-middleware
cd src
npm install
cp .env.example .env   # Fill in your environment details
npm start
```

### 🐳 Running with Docker

```bash
docker pull alexsanderp/kibana-auth-middleware:latest
docker run -p 3000:3000 --env-file .env alexsanderp/kibana-auth-middleware:latest
```

## ✅ Testing

This project uses [Jest](https://jestjs.io/) for unit and integration tests.

> 📁 **Note:** All test commands must be run inside the `src/` directory.

```bash
cd src

# Run all tests
npm test

# Generate a coverage report
npm run test:coverage
```

## 🔐 Security Considerations

- Passwords generated are temporary and unique to each session.
- Users are created with the least privilege (`viewer` role).
- Only emails from allowed domains can authenticate.

## 🤝 Contributing

Contributions are welcome! Please open issues or submit pull requests for new features, bug fixes, or improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 📬 Contact

For questions or feedback, feel free to open an issue on GitHub.
