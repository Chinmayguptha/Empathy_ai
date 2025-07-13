# EmpathyAI Assistant

EmpathyAI is a web-based, AI-powered assistant designed to understand user emotion from text or speech and provide contextually relevant, empathetic responses. It supports multiple languages and offers both voice and text-based interaction, creating a more natural and supportive user experience.

## Core Features

- **Multi-Language Support**: Fully functional in English (`en-US`) and Hindi (`hi-IN`).
- **Dual Input Methods**: Users can either type their message or use their voice for a hands-free experience.
- **Speech-to-Text**: Transcribes user's spoken input into text using the browser's native `SpeechRecognition` API.
- **AI-Powered Emotion Analysis**: Utilizes a Genkit flow with Google's Gemini model to analyze the transcribed text and identify the user's predominant emotion (e.g., joy, sadness, anger, neutral).
- **Empathetic Response Generation**: A second Genkit flow takes the user's original message and the detected emotion to generate a supportive, context-aware, and empathetic response in the user's selected language.
- **Text-to-Speech**: The AI's generated response is spoken back to the user using the browser's native `SpeechSynthesis` API, with the correct voice for the selected language.
- **Interactive Conversation Log**: Displays the history of the conversation in a clean, chat-like interface.

## Tech Stack

This project is built with a modern, full-stack TypeScript architecture:

- **Framework**: **Next.js 15** (with App Router)
- **UI Library**: **React 18**
- **Language**: **TypeScript**
- **AI Toolkit**: **Genkit** for defining and running AI flows.
- **AI Model**: **Google Gemini** for natural language understanding and generation.
- **Styling**: **Tailwind CSS** for utility-first styling.
- **Component Library**: **ShadCN UI** for pre-built, accessible, and themeable components.
- **Speech APIs**: **Web Speech API** (`SpeechRecognition` and `SpeechSynthesisUtterance`) for in-browser voice capabilities.

**Note**: Python is not used in this project. All AI logic is handled via Genkit in a TypeScript environment.

## How It Works: The Application Flow

The application follows a clear, sequential flow from user input to AI response:

1.  **User Input**: The user selects a language (English or Hindi) and either types a message or clicks the "Tap to Talk" button to speak.
2.  **Transcription (Voice Only)**: If voice is used, the browser's `SpeechRecognition` API captures the audio and transcribes it into text.
3.  **Emotion Analysis**:
    - The transcribed text and selected `languageCode` are sent from the frontend to the `analyzeEmotion` Genkit flow (`src/ai/flows/emotion-analyzer.ts`).
    - This flow prompts the Gemini model to identify the predominant emotion and a confidence score. The emotion is returned as a standardized English term (e.g., "sadness").
4.  **Empathetic Response Generation**:
    - The frontend then calls the `generateEmpatheticResponse` flow (`src/ai/flows/empathetic-response-generator.ts`).
    - It passes the original user text, the detected emotion (e.g., "sadness"), and the `languageCode` (e.g., `hi-IN`).
    - This flow uses a detailed prompt to instruct the Gemini model to craft a brief, supportive message that acknowledges the user's emotion and context, **specifically in the requested language**.
5.  **Display & Playback**:
    - The AI's text response is received by the frontend and displayed in the chat log.
    - The `SpeechSynthesis` API is used to read this response aloud in the appropriate language, completing the interaction loop.

## Project Structure

Here is an overview of the key files and directories in the project:

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx          # The main home page of the application.
│   │   ├── layout.tsx        # The root layout for the app.
│   │   └── globals.css       # Global styles and ShadCN theme variables.
│   │
│   ├── components/
│   │   ├── assistant-chat.tsx # The core UI component handling all state and logic.
│   │   └── ui/                 # ShadCN UI components (Button, Card, etc.).
│   │
│   ├── ai/
│   │   ├── flows/
│   │   │   ├── emotion-analyzer.ts            # Genkit flow for detecting emotion.
│   │   │   └── empathetic-response-generator.ts # Genkit flow for generating responses.
│   │   └── genkit.ts         # Genkit initialization and configuration.
│   │
│   └── lib/
│       └── utils.ts          # Utility functions (e.g., `cn` for classnames).
│
├── public/                   # Static assets (not used in this project).
├── package.json              # Project dependencies and scripts.
└── README.md                 # You are here!
```

## Getting Started

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
    cd YOUR_REPOSITORY_NAME
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables (if needed for Google AI):**
    For local development, ensure you are authenticated with Google Cloud CLI (`gcloud auth application-default login`). If you are deploying or running in an environment without this authentication, you will need to set up an API key. Create a file named `.env` in the project root and add your Google Cloud API key:
    ```
    GOOGLE_API_KEY=YOUR_API_KEY_HERE
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open your browser** to [http://localhost:9002](http://localhost:9002) to see the application.

---
