# EventSphere – College Event & Competition Management System

EventSphere is a web-based College Event and Competition Management System designed to simplify and centralize the process of organizing college events.

The platform provides a common system where organizers can manage events, participants can register, volunteers can verify tickets and mark attendance, and judges can evaluate competition participants.

Instead of handling announcements, registrations, attendance, judging, and certificates through separate tools, EventSphere brings these activities together in one platform.

## Table of Contents

- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [Technology Stack](#technology-stack)
- [User Roles](#user-roles)
- [Core Features](#core-features)
- [Application Workflow](#application-workflow)
- [Certificate Generation](#certificate-generation)
- [Authentication and Authorization](#authentication-and-authorization)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Future Improvements](#future-improvements)

## Project Overview

Managing college events and competitions involves several activities, including event creation, participant registration, team management, ticket generation, attendance tracking, judging, and certificate distribution.

When these activities are handled separately, organizers may face difficulties maintaining information and tracking the complete event lifecycle.

EventSphere addresses this problem by providing a centralized platform with role-based access and dedicated functionality for each type of user.

## Objectives

- Centralize college event and competition management.
- Simplify event creation and participant registration.
- Provide QR-based tickets for event entry.
- Make attendance tracking easier through QR scanning.
- Support competition evaluation through judges.
- Simplify certificate generation and distribution.
- Provide different dashboards and permissions for different user roles.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Java, Spring Boot |
| Database | MongoDB |
| Authentication | JWT |
| API Communication | REST APIs |

## User Roles

EventSphere supports the following user roles:

### 1. Super Admin

The Super Admin manages the overall platform and has administrative access to platform-level operations.

### 2. Organizer

Organizers are responsible for managing events and competitions.

**Responsibilities:**
- Create and manage events.
- Add event information and configure event details.
- Publish events for participants.
- Manage registrations.
- Manage competition-related activities.
- Monitor attendance.
- Manage judging and results.
- Generate certificates for eligible participants.

### 3. Participant

Participants can discover events and competitions and take part in them.

**Responsibilities:**
- Browse available events.
- Register for events and competitions.
- Participate in team-based competitions where applicable.
- Access QR-based tickets after registration approval.
- View registration and participation information.
- Access and download issued certificates.

### 4. Judge

Judges are responsible for evaluating participants in competitions.

**Responsibilities:**
- Access assigned judging activities.
- Evaluate competition participants.
- Submit scores and evaluations.
- Support the result preparation process.

### 5. Volunteer

Volunteers help organizers manage event entry and attendance.

**Responsibilities:**
- Access the ticket-scanning functionality.
- Scan participant QR tickets.
- Verify ticket validity.
- Mark participant attendance through the check-in process.

## Core Features

### Event Management
- Create and configure events and competitions.
- Maintain event information.
- Manage event publishing.
- Update event details while the event is in draft status.

### Participant Registration
- Allow participants to register for available events.
- Maintain registration information.
- Prevent duplicate registrations for the same activity.
- Support team-based participation where applicable.

### QR-Based Ticket Management
- Generate QR-based tickets for approved registrations.
- Allow volunteers to scan participant tickets.
- Validate tickets during check-in.
- Track ticket usage and attendance.

### Attendance Management
- Record participant attendance through QR-based check-in.
- Maintain attendance information for event organizers.
- Use attendance information as part of certificate eligibility.

### Competition Management and Judging
- Support competition-based activities.
- Allow assigned judges to evaluate participants.
- Record scores and evaluations.
- Support result publication and winner identification.

### Certificate Management
- Check participant eligibility before certificate generation.
- Generate certificates using participant and event information.
- Store generated certificate records.
- Allow participants to view and download their certificates.
- Provide certificate verification through a certificate number.

## Application Workflow

The general workflow of EventSphere is:

1. **Event Creation:** The organizer creates an event or competition and enters the required information.
2. **Event Publishing:** The organizer publishes the event so that participants can discover it.
3. **Registration:** Participants register for the available event or competition.
4. **Ticket Generation:** After registration approval, the participant receives a QR-based ticket.
5. **Event Check-in:** Volunteers scan the QR ticket to validate it and record attendance.
6. **Competition Evaluation:** For competitions, judges evaluate participants and submit scores.
7. **Result Publication:** The organizer completes the result publication process.
8. **Certificate Generation:** The organizer generates certificates for eligible participants.
9. **Certificate Access:** Participants can access and download their issued certificates.

## Certificate Generation

EventSphere includes a certificate management module that handles certificate eligibility, generation, storage, and access.

The certificate generation process works as follows:

1. The organizer initiates certificate generation.
2. The backend checks the participant's eligibility using registration and attendance information.
3. Winner certificates additionally depend on the published competition result and rank.
4. Thymeleaf is used to populate the certificate HTML template with dynamic participant and event information.
5. OpenHTMLtoPDF converts the generated HTML into a PDF document.
6. The generated PDF is stored, and certificate metadata is maintained in MongoDB.
7. Participants can view their issued certificates and download them through the application.

The system also provides a certificate verification page where certificate issuance can be checked using its certificate number.

## Authentication and Authorization

EventSphere uses JWT-based authentication to secure application access.

- Users authenticate through the login process.
- JWT tokens are used to authenticate subsequent API requests.
- Role-based authorization controls access to protected functionality.
- Backend authorization checks ensure users can perform only the operations permitted by their roles.
- Organizer operations are restricted to the events they are authorized to manage.

## Project Structure

The project contains separate frontend and backend applications.

```text
EventSphere/
│
├── frontend/
│   └── React application
│
├── backend/
│   └── Spring Boot application
│
└── README.md
```

The frontend handles the user interface and communicates with the backend through REST APIs. The backend handles business logic, authentication, authorization, and database operations.

## Getting Started

Follow these steps to run the project locally.

### Prerequisites

Make sure the following tools are installed:

- Java Development Kit (JDK)
- Maven
- Node.js and npm
- MongoDB
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/vanshXS/EventSphere.git

cd EventSphere
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Configure the MongoDB connection and other required application settings using the backend configuration files.

Make sure the required database is accessible before starting the application.

Run the backend using Maven:

```bash
mvn spring-boot:run
```

If the project includes a Maven wrapper, you can use it instead:

```bash
./mvnw spring-boot:run
```

### 3. Configure the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the backend API URL according to the frontend environment configuration.

Start the development server:

```bash
npm run dev
```

The frontend development server will display the local URL in the terminal.

> Note: Exact configuration keys and required environment variables should be taken from the project's current frontend and backend configuration files.

## Testing

The project includes tests for important application functionalities, including:

- Event lifecycle management.
- Attendance management.
- Ticket management.
- Team management.
- Competition-related functionality.

These tests help verify the correctness of important business operations and application workflows.

## Future Improvements

Potential areas for further development include:

- Additional identity verification during QR-based check-in.
- More comprehensive integration and load testing.
- Enhanced analytics and event reporting.
- Improved notification and communication features.
- Additional security and monitoring improvements.

## Project Information

**Project Name:** EventSphere

**Project Type:** College Event & Competition Management System

**Backend:** Java, Spring Boot

**Frontend:** React

**Database:** MongoDB

**Repository:** [EventSphere on GitHub](https://github.com/vanshXS/EventSphere)

---

*EventSphere aims to make college event and competition management more organized by bringing the complete event workflow into a single platform.*
