# Showcase Page Setup

## What Was Added

A new "Showcase" tab has been added to the Merchant Portal Design application that displays:

1. **Presentation Slides Tab** - Displays the "Booklyn Booking Capstone Showcase Slides.pdf" in an embedded PDF viewer
2. **WhatsApp Demo Tab** - Displays the "whatsappdemo.MP4" video with playback controls

## Files Created/Modified

### New Files:
- `src/components/showcase/ShowcasePage.tsx` - Main showcase component with tabs for slides and video
- `public/Booklyn Booking Capstone Showcase Slides.pdf` - Presentation slides
- `public/whatsappdemo.MP4` - Demo video

### Modified Files:
- `src/App.tsx` - Added showcase page to routing
- `src/components/Layout.tsx` - Added showcase navigation item with Presentation icon

## How to Access

1. Start the development server:
   ```bash
   cd "Merchant Portal Design"
   npm run dev
   ```

2. Open the application in your browser (typically http://localhost:5173)

3. Log in to the portal

4. Click on the **"Showcase"** tab in the sidebar navigation (between Automations and Settings)

5. Toggle between two tabs:
   - **Presentation Slides** - View the full capstone presentation
   - **WhatsApp Demo** - Watch the WhatsApp bot demonstration video

## Features

- **PDF Viewer**: Embedded PDF viewer with download and open-in-new-tab options
- **Video Player**: HTML5 video player with standard controls (play, pause, fullscreen, volume)
- **Responsive Design**: Works on desktop and mobile devices
- **Beautiful UI**: Follows the existing design system with cards and tabs
- **Information Section**: Brief description of the Booklyn Booking platform

## Navigation

The Showcase tab is easily accessible from the sidebar menu with a distinctive Presentation icon (📊).

## Notes

- PDF files are served from the `/public` folder and accessed at `/filename.pdf`
- Video files are also served from `/public` folder
- Both files can be downloaded directly from the showcase page
- The showcase page maintains the same styling and theming as the rest of the portal

