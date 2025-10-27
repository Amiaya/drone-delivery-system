# 🛩️ Drone Delivery System

The **Drone Delivery System** is a backend application designed to manage drones, medications, and delivery orders for a drone-based logistics service.  
It provides **RESTful APIs** for handling drones, medications, and orders, as well as simulating drone operations such as **battery management**, **loading**, and **delivery**.

---

## 🚀 Features

- **Drone Management:** Register, list, and manage drones with various operational states (`idle`, `loading`, `delivering`, etc.).
- **Medication Management:** Add, list, and retrieve medications with validation and image uploads.
- **Order Management:** Create and manage orders while enforcing drone weight and battery constraints.
- **Simulations:** Simulate drone battery drain, charging, and delivery processes.
- **Swagger Documentation:** Interactive API documentation available at `/docs`.

---

## ⚙️ Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** — v16 or higher
- **PostgreSQL** — for database storage
- **Redis** — for caching and job processing
- **Cloudinary** — for storing medication images

---

## 🧩 Installation

### Clone the Repository

- git clone https://github.com/Amiaya/drone-delivery-system.git
- cd drone-delivery-system

### Install Dependencies

- yarn

### 🏭 Build and Start Application

- yarn build
- yarn start:dev

### 🧹 Testing

- yarn test

---

### 📚 API Documentation

- http://localhost:${port}/docs

---

### 🧠 Tech Stack

Node.js + Express — Backend Framework

TypeScript — Type Safety

InversifyJS — Dependency Injection

PostgreSQL — Relational Database

Redis — Caching & Job Queue

Cloudinary — Image Storage

Swagger — API Documentation
