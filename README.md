# 🚁 Drone-Assisted Insurance Assessment Service (DAIAS)

<p align="center">
  <strong>Transforming Road Accident Investigations through Drone Technology, 3D Mapping, and Intelligent Spatial Analysis.</strong>
</p>

---

## 📖 Overview

**Drone-Assisted Insurance Assessment Service (DAIAS)** is a web-based accident scene documentation and **3D reconstruction platform** developed as part of the **PRJ371 / PRJ381 Final Year Project**.

Traditional accident investigations are often time-consuming, labour-intensive, and prone to inconsistencies. DAIAS modernises this process by combining **Unmanned Aerial Vehicles (UAVs)**, **open-source photogrammetry**, and **interactive 3D visualisation** to create highly accurate digital reconstructions of accident scenes.

The platform enables **forensic investigators**, **South African Police Service (SAPS)**, and **insurance assessors** to process aerial imagery, generate centimetre-accurate 3D models, perform spatial measurements, and produce professional assessment reports suitable for legal and insurance purposes.

---

## ✨ Key Features

### 🔐 User Authentication & Case Management

* Secure user registration and login
* Create and manage accident investigation cases
* Capture accident metadata, GPS coordinates, weather conditions, flight details, and investigator information

---

### 🌍 Interactive 3D Scene Viewer

* Browser-based 3D visualisation powered by **Three.js**
* Rotate, pan, zoom, and inspect reconstructed accident scenes
* Support for compressed **GLTF** and **OBJ** models
* Real-time rendering using **WebGL**

---

### 📏 Automated Spatial Analysis

* Automatically calculate:

  * Vehicle separation distances
  * Skid mark lengths
  * Collision measurements
  * Scene dimensions
* Point cloud processing for accurate forensic analysis

---

### 📸 Open-Source Photogrammetry Pipeline

Transform raw drone imagery into detailed 3D reconstructions using:

* Orthomosaics
* Dense Point Clouds
* Digital Surface Models (DSM)
* Textured 3D Meshes

Powered by **OpenDroneMap (ODM)** and **WebODM**.

---

### 📄 Automated PDF Report Generation

Generate professional investigation reports containing:

* Accident information
* Flight telemetry
* Spatial measurement tables
* Investigator details
* Embedded 3D scene snapshots
* Evidence suitable for insurance and legal documentation

---

## 🏗️ System Architecture

```
Drone Images
      │
      ▼
 OpenDroneMap / WebODM
      │
      ▼
3D Model Generation
      │
      ▼
Spatial Analysis (Python)
      │
      ▼
MongoDB Database
      │
      ▼
Express.js API
      │
      ▼
React Frontend + Three.js Viewer
      │
      ▼
PDF Assessment Reports
```

---

# 🛠️ Technology Stack

## 🎨 Frontend

| Technology   | Purpose                  |
| ------------ | ------------------------ |
| React.js     | User Interface           |
| Three.js     | Interactive 3D Rendering |
| WebGL        | Browser Graphics Engine  |
| React Router | Navigation               |
| Context API  | Global State Management  |
| Faker.js     | Mock Data & Testing      |

---

## ⚙️ Backend

| Technology | Purpose              |
| ---------- | -------------------- |
| Node.js    | Runtime Environment  |
| Express.js | REST API             |
| MongoDB    | Database             |
| Multer     | File Upload Handling |
| Axios      | API Communication    |

---

## 🛰️ Photogrammetry & Spatial Analysis

| Technology         | Purpose                   |
| ------------------ | ------------------------- |
| OpenDroneMap (ODM) | Photogrammetry Processing |
| WebODM             | Web Interface for ODM     |
| OpenCV             | Image Processing          |
| NumPy              | Numerical Computing       |
| Open3D             | Point Cloud Processing    |
| CloudCompare       | Point Cloud Analysis      |
| QGIS               | GIS & Spatial Analysis    |

---

# 🎯 Target Users

* 🚔 South African Police Service (SAPS)
* 🕵️ Accident Reconstruction Specialists
* 🛡️ Insurance Assessors
* ⚖️ Forensic Investigators
* 🏛️ Legal Professionals

---

# 🚀 Project Objectives

* Reduce accident investigation time
* Improve the accuracy of accident scene documentation
* Automate spatial measurements using computer vision
* Generate legally admissible digital evidence
* Replace manual measurements with drone-assisted workflows
* Provide interactive 3D visualisation for enhanced forensic analysis

---

# 📌 Future Enhancements

* 🤖 AI-powered vehicle damage detection
* 🛰️ Real-time drone flight integration
* 📱 Mobile companion application
* ☁️ Cloud-based processing pipeline
* 🌍 GIS mapping integration
* 📊 Advanced analytics dashboard
* 🔍 Machine learning for collision reconstruction

---

# 📜 License

This project was developed for the **PRJ371 / PRJ381 Final Year Project** and serves as an academic demonstration of modern drone-assisted accident reconstruction, photogrammetry, and web-based 3D visualisation technologies.
