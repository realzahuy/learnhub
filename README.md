# learnhub

learnhub is an online learning platform for students, instructors, and administrators.

## Description

learnhub allows students to discover courses, enroll in free or paid courses, watch video lessons, and complete quizzes. Instructors create course content and submit it for approval, while administrators manage users, categories, and course publication.

The platform also supports online payments, notifications, and an AI assistant that provides learning guidance and recommends published courses.

### Features

- **Students:** Course search and filtering, enrollment, video lessons, quizzes, ratings, and reviews.
- **Instructors:** Course creation, lesson and quiz management, video uploads, submission for approval, and statistics.
- **Administrators:** User and category management, course moderation, and platform statistics.
- **Accounts:** Email verification, password recovery, profile management, and notifications.
- **Integrations:** MoMo and PayPal payments, AWS video processing, and Gemini/Qdrant course recommendations.

### Technology Stack

- **Frontend:** React, TypeScript, Vite, Bootstrap, TanStack Query, and HLS.js.
- **Backend:** Java, Spring Boot, Spring Security, Spring Data JPA, and Spring AI.
- **Database and cache:** MySQL and Caffeine.
- **External services:** Cloudinary, AWS, SMTP, MoMo, PayPal, Gemini, and Qdrant.

## Getting Started

### Dependencies

- JDK 21.
- Node.js 22.12 or later and npm.
- MySQL and Git.
- Accounts and resources for the external services used by the project.

The repository includes a Maven wrapper, so a separate Maven installation is not required.

### Installing

1. Clone this repository and open the project directory.
2. Run [script_db.sql](script_db.sql) on a fresh MySQL setup to create the database and initial data. The backend expects the schema to exist before startup.
3. Copy [learnhub-api/.env.example](learnhub-api/.env.example) to **learnhub-api/.env**.
4. Copy [learnhub-web/.env.example](learnhub-web/.env.example) to **learnhub-web/.env**.
5. Fill in the configuration for your environment, then install frontend dependencies:

```bash
cd learnhub-web
npm ci
```

### Environment Configuration

Use the two **.env.example** files as the configuration reference.

- **Backend:** Provide the MySQL connection, JWT signing secret, and browser access settings.
- **Frontend:** Set the backend API URL and the video playback base URL.
- **Cloudinary:** Obtain your cloud name and API credentials for avatar and course thumbnail storage.
- **AWS:** Prepare S3 buckets, MediaConvert, SQS, EventBridge, and CloudFront. Obtain the bucket names, AWS credentials, MediaConvert role and queue ARNs, SQS queue URLs, and CloudFront URL and signing key information.
- **Email:** Provide SMTP credentials and a sender address.
- **Payments:** Obtain MoMo and PayPal credentials, configure return URLs and callbacks/webhooks, and provide the exchange-rate service URL.
- **AI:** Obtain a Gemini API key and Qdrant connection details, then prepare the course vector collection to match the backend configuration.

AWS event routing and permissions must connect the upload and transcoding services. Full video playback also requires HTTPS and routing for playback sessions and HLS content on the same origin.

For local development, you can use [ngrok](https://ngrok.com/docs/start) to expose your local backend over HTTPS for testing MoMo payments and connecting it to CloudFront.

### Running the Application

Start the backend from the project root:

```powershell
cd learnhub-api
.\mvnw.cmd spring-boot:run
```

On macOS or Linux, run the following from **learnhub-api**:

```bash
./mvnw spring-boot:run
```

In another terminal, start the frontend from the project root:

```bash
cd learnhub-web
npm start
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

### Building

Build the frontend from **learnhub-web**:

```bash
npm run build
```

The output is saved in **learnhub-web/dist**.

Build the backend from **learnhub-api** on Windows:

```powershell
.\mvnw.cmd package
```

On macOS or Linux:

```bash
./mvnw package
```

The backend JAR is saved in **learnhub-api/target**.

The project includes a backend Dockerfile and frontend Vercel routing configuration. Supply the environment settings and external service connections for your deployment.

## Help

If the application does not start, check the database setup and **.env** files. Restart the application after changing configuration; rebuild the frontend when changing deployment URLs.

For problems with email, payments, or video, check the relevant service credentials, permissions, and callback/event configuration. AI recommendations require published courses to be indexed in Qdrant.

## License

No license.
