# CampusBites

![CI](https://img.shields.io/badge/CI-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Firebase](https://img.shields.io/badge/Firebase-Backend-orange)
![Azure](https://img.shields.io/badge/Azure-Deployed-blue)

CampusBites is a university food ordering web application that allows students to browse campus vendors, order meals, and collect them without waiting in long queues. The system supports customer ordering, vendor dashboards, admin approvals, menu management, order tracking, notifications, and account management.

## Live Application

Hosted application:

```txt
https://campusbites-eph0gdg8d2exchh6.southafricanorth-01.azurewebsites.net/
```

## GitHub Repository

```txt
https://github.com/CampusBites-Team/CampusBites
```

## Features

### Customer Features

- Register and log in as a customer
- Browse campus vendors
- View vendor menus
- Add items to cart
- Place orders
- Track order status
- Receive notifications
- Manage customer profile
- Request account deletion with a 30-day recovery period

### Vendor Features

- Register as a vendor
- Wait for admin approval
- Manage store details
- Upload store logo
- Manage menu items
- View and update orders
- View order history
- Manage banking details
- Receive order notifications

### Admin Features

- Approve or reject vendor applications
- Manage vendors
- Review menu items
- View analytics
- Manage platform activity

## Technologies Used

- HTML
- CSS
- Tailwind CSS
- JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Jest
- GitHub Actions
- Codecov
- Azure Web App / Vercel

## Login Credentials for Reviewers

### Admin Account

```txt
Email: admin@gmail.com
Password: admi123
Role: Admin
```

## How to Run the Project Locally

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CampusBites.git
```

### 2. Navigate into the Project Folder

```bash
cd CampusBites
```

### 3. Install Dependencies

```bash
npm install
```

Or, if using the lock file:

```bash
npm ci
```

### 4. Start the Project Locally

Using VS Code Live Server:

1. Open the project folder in VS Code.
2. Right-click `index.html`.
3. Select **Open with Live Server**.

Or use a simple local server:

```bash
npx serve .
```

Then open the local URL shown in the terminal, for example:

```txt
http://localhost:3000
```

## Running Tests

Run all tests:

```bash
npm test
```

Or:

```bash
npx jest
```

Run tests with coverage:

```bash
npx jest --coverage
```

Run a specific test file:

```bash
npx jest __tests__/login.test.js --runInBand
```

## Testing and Coverage

The project uses Jest for automated testing. Current Codecov coverage is **96%**.

Tests cover:

- Authentication
- Registration validation
- Customer profile management
- Vendor settings
- Menu management
- Order handling
- Navbar behaviour
- Account deletion and reactivation
- Toast notifications

Coverage reports are generated with:

```bash
npx jest --coverage
```

Coverage is uploaded to Codecov through GitHub Actions.

## Deployment

The project is deployed using GitHub Actions and Azure Web App.

The main deployment workflow runs when changes are pushed to the `main` branch.

## Project Structure

```txt
CampusBites/
│
├── assets/
│   ├── icons/
│   └── images/
│
├── scripts/
│   ├── auth.js
│   ├── database.js
│   ├── index.js
│   ├── login.js
│   ├── register.js
│   ├── navbar.js
│   └── ...
│
├── __tests__/
│   ├── login.test.js
│   ├── register.test.js
│   ├── customer-profile.test.js
│   └── ...
│
├── .github/
│   └── workflows/
│
├── index.html
├── login.html
├── register.html
├── package.json
└── README.md
```

## Notes for Reviewers

- Please use the hosted application link for final testing.
- Admin credentials are provided above.
- Some features depend on Firebase services, so internet access is required.
- The project should be tested using the deployed site as well as locally where needed.
