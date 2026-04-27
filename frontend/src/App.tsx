import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
  type: 'user' | 'ai';
  text: string;
}

const BookBuddyLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo-svg">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    <path d="M12 7v14"></path>
  </svg>
);

function App() {
  const [books, setBooks] = useState<string[]>([]);
  const [activeBook, setActiveBook] = useState<string>('');
  const [sessions, setSessions] = useState<Record<string, string>>({});
  const [messagesByBook, setMessagesByBook] = useState<Record<string, Message[]>>({});

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch books on mount
  useEffect(() => {
    fetchBooks();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByBook, activeBook, isLoading]);

  const fetchBooks = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books);
        if (data.books.length > 0 && !activeBook) {
          selectBook(data.books[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch books", e);
    }
  };

  const selectBook = (bookName: string) => {
    setActiveBook(bookName);
    if (!sessions[bookName]) {
      startNewChat(bookName);
    }
  };

  const startNewChat = (bookName: string) => {
    setSessions(prev => ({ ...prev, [bookName]: crypto.randomUUID() }));
    setMessagesByBook(prev => ({
      ...prev,
      [bookName]: [{ type: 'ai', text: `Hello! I am your BookBuddy for "${bookName}". Ask me anything about this book.` }]
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const newBook = data.book_name;
        if (!books.includes(newBook)) {
          setBooks(prev => [...prev, newBook]);
        }
        selectBook(newBook);
      } else {
        alert("Failed to upload book.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server for upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeBook) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to active book's history
    setMessagesByBook(prev => ({
      ...prev,
      [activeBook]: [...(prev[activeBook] || []), { type: 'user', text: userMessage }]
    }));

    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessions[activeBook],
          book_name: activeBook,
          question: userMessage
        })
      });

      if (!response.ok) throw new Error('Network error');
      const data = await response.json();

      setMessagesByBook(prev => ({
        ...prev,
        [activeBook]: [...(prev[activeBook] || []), { type: 'ai', text: data.answer }]
      }));
    } catch (err) {
      setMessagesByBook(prev => ({
        ...prev,
        [activeBook]: [...(prev[activeBook] || []), { type: 'ai', text: '⚠️ Error connecting to local API.' }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const currentMessages = activeBook && messagesByBook[activeBook] ? messagesByBook[activeBook] : [];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <BookBuddyLogo />
          <h2>BookBuddy</h2>
        </div>

        <div className="upload-container">
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="glass-btn primary-glow upload-btn"
            disabled={isUploading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            {isUploading ? 'Uploading...' : 'Upload PDF Book'}
          </button>
        </div>

        <div className="books-list">
          <h3>Your Library</h3>
          {books.length === 0 && <p className="empty-state">No books uploaded yet.</p>}
          <ul>
            {books.map(book => (
              <li
                key={book}
                className={`book-item ${activeBook === book ? 'active' : ''}`}
                onClick={() => selectBook(book)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                <span className="book-name" title={book}>{book}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-footer">
          {activeBook && (
            <button onClick={() => startNewChat(activeBook)} className="glass-btn outline-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
              Clear Chat
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        <header className="chat-header">
          <h1>{activeBook ? activeBook : "Welcome to BookBuddy"}</h1>
          {!activeBook && <p>Upload a PDF to start chatting</p>}
        </header>

        <div className="chat-box">
          {currentMessages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}-message pop-in`}>
              <div className="bubble">
                {msg.text.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai-message pop-in">
              <div className="bubble typing-indicator">
                <div className="dot"></div><div className="dot"></div><div className="dot"></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-container">
          <form onSubmit={handleSend} className="chat-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeBook ? `Ask a question about ${activeBook}...` : "Please upload or select a book first"}
              required
              disabled={!activeBook || isUploading}
            />
            <button type="submit" className="glass-btn action-btn" disabled={isLoading || !activeBook || isUploading}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
