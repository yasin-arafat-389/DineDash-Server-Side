# DineDash (Backend)

## Project Overview

This is the backend server for the **DineDash**, a comprehensive platform providing an online shopping experience for customers, vendors, and administrators. It manages the data, business logic, and APIs for the frontend, including features like product management, order processing, user authentication, and vendor shop management.

## Features

- **Full platform monitoring and control**
- **Product category management**
- **Blacklist vendor shops**
- **Add, edit, duplicate, or delete products**
- **View customer reviews and ratings**
- **Browse products and shops with advanced filters and search**
- **Product comparison for up to three items**

## Technology Stack

- **Programming Language**: JavaScript
- **Web Framework**: Express.js
- **Database**: MongoDB

## Live URLs

- **Backend Live URL:** [Frontend Deployment](https://dine-dash-backend-side.vercel.app/)

## Setting Up and Using the Application

### Prerequisites

- Node.js (>=14.x)
- npm or yarn
- MongoDB

### Installation

1. **Clone the repository**:

   ```sh
   https://github.com/yasin-arafat-389/DineDash-Server-Side
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add the following variables:

   ```
   PORT= specify_a_port
   DB_USER= your_database_user_name
   DB_PASSWORD= your_database_password
   SMTP_HOST= your_smtp_host_name
   SMTP_PORT= your_smtp_port_name
   SMTP_MAIL= your_smtp_email_address
   SMTP_PASSWORD= your_smtp_password
   STORE_ID= SSLCOMMERZ_store_id
   STORE_PASS= SSLCOMMERZ_store_password
   ```

4. **Run the application**:
   ```sh
   npm run dev
   ```

### Key Packages

- **jsonwebtoken** - For secure user authentication using JWT.
- **bcrypt** - For password hashing and security.
- **multer** - For handling file uploads.
- **dotenv** - For environment variable management.
- **cors** - For cross-origin requests.
- **express-validator** - For request validation.
- **nodemailer** - For sending password reset emails.
