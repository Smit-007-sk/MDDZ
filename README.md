# NUDOT Website Refactoring Project

This is a clean, modular, and editable version of the **nudot.com.tw** website. The original monolithic index file has been decomposed into independent CSS stylesheets, JavaScript modules, and HTML partials, preserving all premium animations and WebGL effects.

---

## Getting Started

### 1. Requirements
Ensure you have [Node.js](https://nodejs.org) installed on your system.

### 2. Run Locally
Start a local static server to view the animations and page transitions:
```bash
# Start a dev server (e.g. port 8085)
npx -y http-server . -p 8085
```
Open your browser and navigate to `http://localhost:8085`.

---

## How to Customize Content

### 1. Centralized Site Configuration (`js/site-config.js`)
To edit brand titles, contact addresses, phone numbers, or social media links, modify `js/site-config.js`:
```javascript
window.NUDOT_SITE_CONFIG = {
  brandName: "Your Brand Name",
  email: "your-email@example.com",
  phone: "(04) 1234-5678",
  socials: {
    instagram: "https://instagram.com/...",
    facebook: "https://facebook.com/..."
  }
};
```

### 2. Centralized Animation Settings (`js/animation-config.js`)
To adjust the loader timing, cursor lerp response, slide transitions, or smooth scrolling parameters, edit `js/animation-config.js`:
```javascript
window.NUDOT_ANIMATION_CONFIG = {
  loader: {
    targetMs: 2700, // hold time in milliseconds
  },
  cursor: {
    lerp: 0.1,      // mouse follow sensitivity
  }
};
```

### 3. Missing Video Assets
Please note that all video files (`.mp4`) are omitted in this downloaded copy due to server bandwidth limits of the origin platform. If you wish to restore video backgrounds:
1. Gather your assets (`images/home/slider1/slider01.mp4`, `images/wavebg.mp4`, etc.).
2. Copy them to the corresponding paths in the project directory.

---

## Architecture details
For detailed developer documentation on modular divisions, scripts, and styling files, see [ARCHITECTURE.md](file:///c:/nud/nudot.com.tw/ARCHITECTURE.md).
