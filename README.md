# AR Generator / Task Management App

A modern, high-performance task management and report generation application built with React, TypeScript, and Vite. This application features a premium UI with AI-powered assistance, multi-view task management, and professional document generation.

## 🚀 Key Features

*   **🤖 AI-Powered Workflow**: 
    *   Integrated Google Gemini AI for smart task assistance.
    *   Rich Markdown support for AI responses, including tables and formatted text.
*   **📋 Multi-View Task Management**:
    *   **List View**: Spreadsheet-like efficiency for bulk task management.
    *   **Kanban Board**: Drag-and-drop workflow visualization with customizable status columns.
    *   **Calendar**: Track deadlines and schedule tasks visually.
    *   **Gantt Chart**: Visual project timeline and dependency management.
    *   **Timesheet**: Professional time tracking and log management with daily totals.
*   **📄 Professional Report Generation**:
    *   Generate official reports (AR/Work Logs) directly from your tasks.
    *   Export high-quality `.docx` documents with automated formatting.
    *   Template-based generation for consistent document standards.
*   **⏱️ Advanced Productivity Tools**:
    *   **Stopwatch/Timer**: Integrated time tracking with active timers in the application header.
    *   **Clickable Subtasks**: Deep task nesting with detailed views for every sub-level.
    *   **Dynamic Statuses**: Rename, color-code, and reorder status groups to fit your workflow.
*   **✨ Premium UI/UX**:
    *   **Collapsible Sidebar**: Maximize your workspace with a responsive, icon-retaining sidebar.
    *   **Theme System**: Fully integrated Dark/Light mode with custom accent colors.
    *   **Modern Aesthetics**: Glassmorphism, smooth animations, and a refined "Premium" date picker.

## 🛠️ Technology Stack

*   **Core**: React 19, Vite, TypeScript
*   **AI Integration**: @google/generative-ai
*   **State Management**: Zustand
*   **Styling**: Vanilla CSS with Design Tokens & CSS Variables
*   **Document Generation**: docx, file-saver
*   **Icons**: Lucide React
*   **Drag & Drop**: @dnd-kit (Core, Sortable, Modifiers)
*   **Markdown**: react-markdown, remark-gfm

## 🏃‍♂️ Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/ar-generator-react.git
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure environment**
    Create a `.env` file based on `.env.example` and add your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## ☕ Support

This project is open-source and free to use! If you find it helpful, please consider supporting its development.

You can access the donation page through **Settings → Support** in the application, where you'll find QR codes for:
- **Maribank** - JUNDEE MARK M.
- **Landbank** - JUNDEE MARK MOLINA

Your support helps keep this project maintained and actively developed. Thank you! ❤️

## 📝 License

This project is licensed under the MIT License.

