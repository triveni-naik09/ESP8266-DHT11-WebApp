# 🌐 Simple IoT World

> **An End-to-End IoT & Web Application**  
> Developed with ❤️ by **Triveni**, Department of ETC, SB Jain, Nagpur.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Hardware Specifications & Pin Mapping](#-hardware-specifications--pin-mapping)
4. [Web Application Features](#-web-application-features)
5. [Render Deployment Guide (Step-by-Step)](#-render-deployment-guide-step-by-step)
6. [ESP8266 Hardware Setup & Arduino IDE Guide](#-esp8266-hardware-setup--arduino-ide-guide)
7. [REST API Documentation](#-rest-api-documentation)
8. [Manual Testing Instructions](#-manual-testing-instructions)

---

## 🌟 Project Overview

**Simple IoT World** connects an **ESP8266 (NodeMCU CP2102)** microcontroller with a modern, responsive web application deployable on **Render**. It streams ambient telemetry (temperature & humidity) from a **DHT11 sensor**, provides interactive graphs, maintains a paginated historical log in **IST (Asia/Kolkata +5:30)**, allows real-time text broadcasting to an **I2C 16x2 LCD**, and toggles a physical **LED actuator** through a futuristic 3D power switch.

---

## 💻 Tech Stack

- **Front-End:** Semantic HTML5, Tailwind CSS (CDN), Chart.js, Vanilla JS
- **Back-End:** Node.js & Express.js
- **Database:** JSON-based local database (`data/db.json`)
- **IoT Firmware:** C++ (Arduino IDE) for ESP8266 NodeMCU CP2102
- **Hosting / Cloud:** Configured for seamless deployment on **Render** (Free Web Service)

---

## 🔌 Hardware Specifications & Pin Mapping

### Microcontroller: **ESP8266 NodeMCU (CP2102)**

| Component | NodeMCU Pin | GPIO | Description / Details |
|---|---|---|---|
| **DHT11 Sensor** | **D5** | GPIO 14 | Temperature & Humidity Sensor Data Pin |
| **16x2 LCD I2C SCL** | **D1** | GPIO 5 | I2C Clock Pin (Address: `0x27`) |
| **16x2 LCD I2C SDA** | **D2** | GPIO 4 | I2C Data Pin (Address: `0x27`) |
| **Actuator LED** | **D3** | GPIO 0 | Actuator LED (Anode via 220Ω resistor, Cathode to GND) |
| **Power Supply** | **VIN / 3V3 / GND** | — | VCC to 3.3V or 5V (LCD), GND to GND |

### WiFi Credentials (Hardcoded in Sketch):
- **WiFi Name (SSID):** `ESP8266`
- **Password:** `12345678`

---

## 🎨 Web Application Features

### 1. Theme & Visual Design
- **Gradient Theme:** Vibrant Pink (`#ec4899`) and Blue (`#3b82f6`) styling with glassmorphic cards.
- **Light/Dark Mode Toggle:** Instant theme switcher with icon animation, persisted via `localStorage`.
- **Header:**
  - App Name: **Simple IoT World**
  - Logged-in User Pill: **Welcome Triveni**
  - **ESP8266 Status Indicator:** Live badge displaying **ONLINE** (pulsing green radar dot) or **OFFLINE** (with last-seen counter).
- **Footer:**
  - `Developed with Love ❤️ by Triveni. Department of ETC, SB Jain, Nagpur` (with animated heartbeat CSS pulse).

### 2. Page 1: Authentication Portal (`/index.html`)
- Glassmorphic card with seamless toggle between **Sign In** and **Create Account**.
- Fields: **Name**, **Email**, **Password**.
- 1-Click **"Auto-fill Demo Account (Triveni)"** button for instant manual testing.

### 3. Page 2: Web Dashboard (`/dashboard.html`)
- **Tab 1: Telemetry & Records**
  - **Section 1 (Gauges & Graphs):**
    - Large circular SVG gauges with gradient meters and comfort status badges for Temperature (`0 to 50 'C`) and Humidity (`0 to 100%`).
    - Interactive dual-axis **Chart.js** line graph with smooth bezier curves and responsive tooltips.
  - **Section 2 (Saved Records Log with Pagination):**
    - Columns: `# | Temperature | Humidity | Time | Date | Action (Delete)`
    - Example: `1 | 34 'C | 50% | 07:18 PM | 03-10-2026 | Delete`
    - Timezone strictly formatted to **Asia/Kolkata (+5:30)**.
    - Delete button removes record from the JSON database with instant re-render.
- **Tab 2: Smart LCD Display Controller**
  - **Field 1 (Max 16 Characters):** Text for Row 1.
  - **Field 2 (Max 16 Characters):** Text for Row 2.
  - Real-time character count indicators (`X/16`).
  - **Live Photorealistic 16x2 LCD Simulation:** Dot-matrix blue/green backlit preview showing exactly what the hardware displays.
  - Save button syncs text to the server for the ESP8266 to retrieve.
  - 1-Click quick presets (e.g., *Welcome Triveni*, *SB Jain ETC Dept*, *IoT Lab Active*).
- **Tab 3: LED Actuator Control**
  - **Innovative 3D Tactile Neon Power Switch:** Glowing cybernetic power button with neon halo.
  - Real-time 5mm LED diode simulation.
  - Tactile audio click synthesizer (Web Audio API).
  - Synchronized with NodeMCU Pin D3 state (`ON` = HIGH 3.3V, `OFF` = LOW 0V).

---

## 🚀 Render Deployment Guide (Step-by-Step)

The project includes standard `package.json` scripts and `render.yaml` for 1-click deployment.

### Step 1: Push Code to GitHub / GitLab
1. Initialize a git repository in this folder (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Simple IoT World"
   ```
2. Create a repository on GitHub (e.g. `Simple-IoT-World`) and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/Simple-IoT-World.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Create Web Service on Render
1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`Simple-IoT-World`).
4. Configure the service settings:
   - **Name:** `simple-iot-world`
   - **Environment:** `Node`
   - **Region:** Any region close to you (e.g. Singapore or Frankfurt)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** `Free`
5. Under **Environment Variables**, add:
   - `NODE_VERSION` = `20.x`
   - `TZ` = `Asia/Kolkata`
6. Click **Deploy Web Service**.
7. Wait 1-2 minutes until Render status displays **Live**.
8. Copy your Render URL (e.g. `https://simple-iot-world.onrender.com`).

---

## 🛠️ ESP8266 Hardware Setup & Arduino IDE Guide

### Step 1: Install Required Libraries in Arduino IDE
Open Arduino IDE -> **Tools** -> **Manage Libraries...** and install:
1. **LiquidCrystal_I2C** (by Frank de Brabander or Marco Schwartz)
2. **DHT sensor library** (by Adafruit) + **Adafruit Unified Sensor**
3. **ArduinoJson** (by Benoît Blanchon, version 6.x or 7.x)

### Step 2: Open Sketch
Open `esp8266/Simple_IoT_World_ESP8266.ino`.

### Step 3: Insert Your Render URL
Find line 42 in `Simple_IoT_World_ESP8266.ino`:
```cpp
// Change:
const char* serverUrl = ""; 

// To your deployed Render URL (no trailing slash):
const char* serverUrl = "https://simple-iot-world.onrender.com";
```

### Step 4: Flash NodeMCU
1. Connect NodeMCU CP2102 to your PC via Micro-USB.
2. In Arduino IDE:
   - **Board:** NodeMCU 1.0 (ESP-12E Module)
   - **Port:** Select your COM port (e.g., `COM3` or `COM4`)
   - **Upload Speed:** `115200`
3. Click **Upload** (Arrow icon).

### Hardware LCD Display Sequence:
- **During Setup:**
  - `R1: MyProject` / `R2: WELCOME` *(3s)*
  - `R1: CONNECTING TO` / `R2: WiFi.........`
  - `R1: CONNECTED TO` / `R2: WiFi...SUCCESS` *(2s)*
- **During Loop (Cycles every 10s):**
  - `R1: TEMPERATURE` / `R2: 38 'C` *(2s)*
  - `R1: HUMIDITY` / `R2: 59 %` *(2s)*
  - `R1: SMART DISPLAY` / `R2: <Text from Web Tab 2>` *(2s)*
  - `R1: LED STATUS` / `R2: ON/OFF` *(2s)*

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Payload / Query |
|---|---|---|---|
| `GET` | `/health` | Server uptime & status check | — |
| `POST` | `/api/auth/register` | Register new user | `{ "name", "email", "password" }` |
| `POST` | `/api/auth/login` | Login to dashboard | `{ "email", "password" }` |
| `POST` | `/api/iot/data` | ESP8266 posts sensor readings | `{ "temperature": 34.0, "humidity": 50 }` |
| `GET` | `/api/iot/control` | ESP8266 polls LCD text & LED state | Returns `{ lcdLine1, lcdLine2, ledStatus }` |
| `GET` | `/api/iot/status` | Web app checks device online state | Returns online status, telemetry, etc. |
| `POST` | `/api/control/lcd` | Update 16x2 LCD lines (max 16 chars) | `{ "line1": "...", "line2": "..." }` |
| `POST` | `/api/control/led` | Toggle Pin D3 LED actuator | `{ "status": "ON" \| "OFF" }` |
| `GET` | `/api/records` | Paginated records log | `?page=1&limit=10&order=desc` |
| `DELETE`| `/api/records/:id` | Delete telemetry record | — |
| `POST` | `/api/iot/simulate` | Test simulator for manual testing | Generates simulated sensor reading |

---

## 🧪 Manual Testing Instructions

As requested, you can test everything manually without hardware plugged in:

1. **Start the local server:**
   ```bash
   npm start
   ```
   Open your browser at `http://localhost:3000`.

2. **Test Authentication:**
   - Click **"⚡ Auto-fill Demo Account (Triveni)"** or register a new user.
   - Click **Sign In to Dashboard**.

3. **Test Dashboard Features:**
   - **Tab 1:**
     - Observe the **Temperature & Humidity circular gauges**.
     - Click **"⚡ Simulate Sensor Reading"** in the top navigation bar. Notice the gauges smoothly animate and the **Chart.js** curve updates!
     - Scroll to **Section 2 (Saved Records)**: Verify the pagination buttons, IST timestamps (`Asia/Kolkata +5:30`), and delete a row by clicking the **Delete** button.
   - **Tab 2 (LCD Control):**
     - Type text into **Field 1** and **Field 2** (notice character counter enforces max 16 chars).
     - Watch the photorealistic **16x2 LCD simulation** display update in real time.
     - Click **Save to LCD**.
   - **Tab 3 (LED Actuator):**
     - Click the **3D Glowing Power Switch**.
     - Notice the tactile click audio, glowing pink/blue neon halo, and the simulated hardware diode turning ON/OFF.
   - **Light / Dark Mode:**
     - Click the **Theme** button in the header to toggle between dark mode and light mode.
