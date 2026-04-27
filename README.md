<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/book-open-check.svg" width="100" alt="BookBuddy Logo" />
  <h1>📚 BookBuddy</h1>
  <p><strong>Your intelligent reading companion.</strong></p>
</div>

---

## 📖 What is BookBuddy?

Have a massive textbook, a long document, or an interesting book, but don't have the time to read it cover-to-cover? **BookBuddy** is here to help! 

BookBuddy is your personal AI reading assistant. Simply upload any PDF book, and BookBuddy will process it, understand its contents, and allow you to **chat directly with your book**. Ask questions, extract key concepts, or summarize chapters instantly without reading the entire document.

With an intuitive, sleek, and tabbed interface, you can maintain separate chat sessions for multiple books simultaneously. Your reading has never been this efficient!

## ✨ Features

- **Upload & Process PDFs**: Ingest any PDF instantly into a local Vector Database.
- **Multi-Document Support**: Upload multiple books and switch between them effortlessly using a tabbed interface.
- **Isolated Chat Memory**: Context is maintained per book. Switching books seamlessly shifts your AI assistant's context.
- **Stunning UI**: A sleek, dark-mode React interface with dynamic micro-animations.
- **100% Local**: Powered entirely by local LLMs (Ollama) and Vector Databases (Chroma), ensuring complete privacy. No data leaves your machine.

## 🛠️ Technologies Used

### Frontend
- **React.js (Vite)**
- **TypeScript**
- **Vanilla CSS** (Custom designed UI)

### Backend
- **Python (FastAPI)**
- **LangChain** (RAG Architecture, Chains, Retrievers)
- **ChromaDB** (Vector Store)
- **Ollama** (Local embeddings and LLM inference using Llama 3)

---

## 🚀 Getting Started

### Prerequisites

Before cloning, ensure you have the following installed on your system:
1. **Node.js & npm**: For the frontend.
2. **Python 3.9+**: For the backend API.
3. **Ollama**: Must be installed and running on your machine.
   - You need to pull the `llama3` and `nomic-embed-text` models:
     ```bash
     ollama run llama3
     ollama pull nomic-embed-text
     ```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YourUsername/BookBuddy.git
   cd BookBuddy
   ```

2. **Setup the Backend:**
   ```bash
   # Navigate to the backend directory (or stay in root if using the Makefile)
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. **Setup the Frontend:**
   ```bash
   cd frontend
   npm install
   ```

### Running BookBuddy

You can run both the frontend and backend easily if you have `make` installed, using the provided Makefile in the root directory:

```bash
make run
```

If you prefer to run them manually:

**Terminal 1 (Backend):**
```bash
source venv/bin/activate
cd backend
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Finally, open your browser and go to `http://localhost:5173`. Upload a PDF and start chatting!

---

<div align="center">
  <i>Read smarter, not harder.</i>
</div>
