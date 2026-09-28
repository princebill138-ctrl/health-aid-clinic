# 🏥 HEALTH-AID CLINIC — Hospital Management System

A full-stack Hospital Management System built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JS.

---

## 📁 FOLDER STRUCTURE

```
health-aid-clinic/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── models/
│   │   ├── User.js              # Staff/users model
│   │   ├── Patient.js           # Patient records model
│   │   ├── Drug.js              # Pharmacy/drugs model
│   │   ├── Appointment.js       # Appointments model
│   │   ├── Billing.js           # Billing/invoices model
│   │   ├── Attendance.js        # Staff attendance model
│   │   └── Vaccination.js       # Vaccination records model
│   ├── routes/
│   │   ├── auth.js              # Login, setup endpoints
│   │   ├── patients.js          # Patient CRUD
│   │   ├── pharmacy.js          # Drug inventory CRUD
│   │   ├── appointments.js      # Appointments CRUD
│   │   ├── billing.js           # Billing CRUD
│   │   ├── attendance.js        # Check-in/out, records
│   │   ├── vaccination.js       # Vaccination CRUD
│   │   ├── reports.js           # Monthly reports
│   │   └── staff.js             # Staff management
│   ├── server.js                # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/
│   │   └── style.css            # Main stylesheet (white & brown theme)
│   ├── js/
│   │   ├── app.js               # Shared utilities, API client, Auth
│   │   └── sidebar.js           # Sidebar HTML renderer
│   ├── pages/
│   │   ├── login.html           # Login page
│   │   ├── dashboard.html       # Main dashboard
│   │   ├── patients.html        # Patient records
│   │   ├── appointments.html    # Appointments
│   │   ├── pharmacy.html        # Drug inventory
│   │   ├── billing.html         # Billing & invoices
│   │   ├── attendance.html      # Staff attendance
│   │   ├── vaccination.html     # Vaccination program
│   │   ├── reports.html         # Monthly reports
│   │   └── staff.html           # Staff management (admin only)
│   └── index.html               # Redirects to login
├── package.json
└── README.md
```

---

## 🚀 LOCAL SETUP

### Prerequisites
- **Node.js** v16+ → https://nodejs.org
- **MongoDB** (local) → https://www.mongodb.com/try/download/community  
  OR use MongoDB Atlas (free cloud) → https://cloud.mongodb.com

### Steps

```bash
# 1. Clone or extract the project
cd health-aid-clinic

# 2. Install backend dependencies
cd backend
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Start the server
npm start
# OR for development with auto-reload:
npm run dev
```

### 5. First-time Setup
Open your browser and go to: **http://localhost:5000**

The system auto-creates an admin account on first load:
- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ Change the admin password immediately after first login via Staff Management.

---

## 🌐 DEPLOYMENT ON INFINITYFREE

InfinityFree supports **PHP + MySQL only** (no Node.js). To deploy this app, you have two options:

---

### Option A: Deploy Backend on Render (Free) + Frontend on InfinityFree

#### Step 1: Deploy Backend to Render.com (Free Tier)
1. Create account at https://render.com
2. Connect your GitHub repo
3. Create a **Web Service**:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add Environment Variables:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = any random long string
5. Copy your Render URL (e.g. `https://health-aid-clinic.onrender.com`)

#### Step 2: Update API URL in Frontend
In `frontend/js/app.js`, change:
```js
const BASE = '/api';
```
to:
```js
const BASE = 'https://health-aid-clinic.onrender.com/api';
```

#### Step 3: Upload Frontend to InfinityFree
1. Login to https://infinityfree.com
2. Create a new hosting account
3. Go to **File Manager** → **htdocs**
4. Upload all files from the `frontend/` folder
5. Your site is live at your InfinityFree domain

---

### Option B: Full Cloud Deployment on Railway (Recommended)

Railway supports Node.js natively and is easiest:

1. Create account at https://railway.app
2. Click **New Project → Deploy from GitHub Repo**
3. Set **Root Directory** to `backend`
4. Add these variables:
   - `MONGODB_URI` = MongoDB Atlas URI
   - `JWT_SECRET` = secret string
   - `PORT` = 5000
5. In `server.js`, the static file path already serves the frontend.
6. Copy all `frontend/` files into `backend/public/` and update the static path to `path.join(__dirname, 'public')`.
7. Deploy — everything runs from one URL.

---

### MongoDB Atlas Setup (Free Cloud DB)
1. Go to https://cloud.mongodb.com
2. Create free account → Create free M0 cluster
3. Create database user (username + password)
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Click **Connect → Drivers** → Copy the URI
6. Replace `<password>` in the URI with your DB password
7. Use this as your `MONGODB_URI`

---

## 🔐 DEFAULT LOGIN

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | Admin |

---

## 🧩 FEATURES

| Module | Features |
|--------|----------|
| 🔐 Auth | Login, JWT tokens, role-based access |
| 🧑‍⚕️ Patients | Add/Edit/Delete, search, print records |
| 💊 Pharmacy | Drug inventory, low-stock alerts, restock |
| 📅 Appointments | Book/update/cancel, filter by date/status |
| 🧾 Billing | Generate invoices, mark paid, print |
| 🕐 Attendance | Check-in/out, monthly tracking |
| 💉 Vaccination | Record vaccines, search/filter |
| 📈 Reports | Monthly patient/revenue/attendance reports |
| 👥 Staff | Add/edit staff (admin only) |

---

## 🎨 DESIGN

- **Theme:** White & Brown — clean, clinical, professional
- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Layout:** Fixed sidebar + topbar + scrollable main content
- **Responsive:** Works on mobile, tablet, and desktop
- **Print:** All pages have print stylesheets for records/reports

---

## 🛠 TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Hosting | Node.js on Render/Railway + MongoDB Atlas |
