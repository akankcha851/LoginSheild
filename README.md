# LoginShield 🛡️

> **Real-Time Authentication Threat Detection & Monitoring Platform**

LoginShield is a lightweight, high-performance security layer designed to detect, analyze, and mitigate authentication threats in real-time. It acts as an intelligent shield between users and core systems, evaluating behavioral anomalies, geographic shifts, and velocity-based attacks (e.g., brute force) before granting access.

---

## ⚡ Core Architecture

LoginShield operates on a zero-dependency frontend architecture for maximum speed, coupled with a high-concurrency Python backend.

*   **Backend Interface:** Python 3.12+ with **FastAPI** for asynchronous, high-throughput API routing.
*   **Intelligence Engine:** Custom heuristic risk-scoring algorithm evaluating IP reputation, device signatures, and temporal login patterns.
*   **Data Persistence:** **SQLite** (Development) / Easily extensible to PostgreSQL for production deployments.
*   **Frontend Client:** Pure HTML5, CSS3, and Vanilla JavaScript. No React/Vue overhead, ensuring sub-100ms render times for the security dashboard.

---

## 🛠️ Key Features

### 1. Passwordless Authentication Pipeline
*   Secure, OTP-based verification flow simulating real-world SMS/Email infrastructure.
*   Session-based identity tracking with automatic timeout handling.

### 2. Threat Detection & Risk Engine
*   **Velocity Tracking:** Automatically detects and flags brute-force and credential-stuffing attacks.
*   **Contextual Analysis:** Calculates a dynamic Risk Score (0-100) based on location changes, unknown devices, and failure rates.
*   **Categorization:** Segments traffic into `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL` risk tiers.

### 3. Security Intelligence Dashboard
*   **Real-Time Telemetry:** Live visualization of access rates, authentication failures, and critical risks.
*   **Event Investigation:** Deep-dive threat analysis views exposing exact detection reasons, geographic origin, and raw device telemetry.

### 4. Simulation Lab
*   Built-in developer environment to inject synthetic threat data.
*   Simulate high-velocity brute-force attacks and suspicious success scenarios to test engine threshold limits.

---

## 🚀 Local Deployment Guide

### Prerequisites
*   Python 3.10 or higher
*   Git

### Installation Steps

**1. Clone the repository**
```bash
git clone [https://github.com/YOUR_USERNAME/LoginShield.git](https://github.com/YOUR_USERNAME/LoginShield.git)
cd LoginShield
