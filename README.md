
# Aoe4 Draft Overlay

A real-time draft data visualization tool for Age of Empires IV broadcasts and streaming. This application allows users to create and manage draft layouts for displaying player information, civilization picks and bans, map pools, and scores during live events.

## Features

*   **Customizable Layouts:** Create multiple canvases with different elements like player names, scores, civilization pools, map pools, and more.
*   **Draggable and Resizable Elements:** Easily arrange and resize elements on the canvas to fit your broadcast needs.
*   **Real-time Updates:** Connects to a data source (details TBD based on further investigation of `src/store/draftStore.ts`) to display live draft information.
*   **Saved Layouts:** Save and load your canvas layouts, including element positions, sizes, and settings.
*   **Broadcast View:** Provides a clean view of the selected canvas for OBS or other streaming software.
*   **Technical Interface:** Manage draft data, player information, and application settings.
*   **Studio Interface:** Design and control the visual layout of the overlay.

## Getting Started

To get started with the Aoe4 Draft Overlay, follow these steps:

1.  **Prerequisites**:
    *   Ensure you have [Node.js](https://nodejs.org/) installed (which includes npm).

2.  **Download and Extract**:
    *   Download the project files (e.g., as a ZIP archive from the repository).
    *   Extract the archive to a folder on your computer.

3.  **Running the Application**:
    *   Navigate to the project folder in your terminal or command prompt.
    *   You have a few options to run the application:

    *   **For Development (with hot-reloading):**
        *   **Windows**: Double-click `run-dev.bat` or run `.\run-dev.bat` in the command prompt.
        *   **Linux/macOS**: Run `sh run-dev.sh` or `./run-dev.sh` (after making it executable with `chmod +x run-dev.sh`) in the terminal.
        *   This will install dependencies and start a development server (usually at `http://localhost:5173`). Your browser should open automatically.

    *   **For Production Preview (after building):**
        *   **Windows**: Double-click `run-preview.bat` or run `.\run-preview.bat` in the command prompt.
        *   **Linux/macOS**: Run `sh run-preview.sh` or `./run-preview.sh` (after making it executable with `chmod +x run-preview.sh`) in the terminal.
        *   This will install dependencies, build the application for production (into the `dist` folder), and then start a preview server (usually at `http://localhost:4173`).

    *   **Manual Steps (via terminal):**
        1.  Open your terminal or command prompt in the project's root directory.
        2.  Install dependencies: `npm install`
        3.  For development: `npm run dev`
        4.  To build for production: `npm run build`
        5.  To preview the production build: `npm run preview`

4.  **Using the Overlay**:
    *   Once the application is running, open the displayed URL in your web browser.
    *   The **Technical Interface** (`/technical`) is where you manage draft data and general settings.
    *   The **Studio Interface** (`/studio`) is where you design your broadcast layouts.
        *   Use the "Import / Export Layouts" section to share your layouts. Export will download an `aoe4-layouts.json` file. You can commit this file to your version control. Other users can then download it and use the "Import Layouts from File" button.
    *   The **Broadcast View** (accessible via a link from the Studio Interface, typically like `/?view=broadcast&canvasId=YOUR_CANVAS_ID`) is the clean output for your streaming software (e.g., OBS).

## License & Credits

* **License:** MIT – do whatever you want but no warranty.
* Uses assets and draft logic inspired by the Age of Empires IV community and drafting tools. (Original credit to aoe2cm.net removed as this is now for AoE4).
* Inspired by work of **HSZemi**, **SamuelMeilleur**, and the wider Age of Empires IV community.
  Thank you for keeping competitive drafting awesome!
