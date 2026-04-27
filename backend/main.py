import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

app = FastAPI(title="BookBuddy RAG API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows standard local frontend servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
CHROMA_BASE_PATH = "./chroma_db"
DATA_PATH = "./data"
EMBEDDING_MODEL = "nomic-embed-text"
LLM_MODEL = "llama3"

# Setup globals
store = {}
# Cache for rag chains: {book_name: chain}
chain_cache = {}

os.makedirs(CHROMA_BASE_PATH, exist_ok=True)
os.makedirs(DATA_PATH, exist_ok=True)

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

def get_or_create_chain(book_name: str):
    if book_name in chain_cache:
        return chain_cache[book_name]
    
    chroma_path = os.path.join(CHROMA_BASE_PATH, book_name)
    if not os.path.exists(chroma_path):
        raise HTTPException(status_code=404, detail=f"Book '{book_name}' not found.")
    
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    db = Chroma(persist_directory=chroma_path, embedding_function=embeddings)
    retriever = db.as_retriever(search_kwargs={"k": 5})
    llm = ChatOllama(model=LLM_MODEL, temperature=0.3)

    # 1. Contextualize question prompt
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

    # 2. Answer question prompt
    qa_system_prompt = (
        f"You are a helpful and intelligent assistant discussing the book '{book_name}'. "
        "Use the provided context to answer the user's question accurately. "
        "If the answer cannot be found in the context or chat history, state that you cannot find the answer in the book.\n\n"
        "Context:\n{context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", qa_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    # 3. Add History wrapper
    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )
    chain_cache[book_name] = conversational_rag_chain
    return conversational_rag_chain

class QuestionRequest(BaseModel):
    session_id: str
    book_name: str
    question: str

@app.get("/api/books")
def list_books():
    books = []
    if os.path.exists(CHROMA_BASE_PATH):
        for name in os.listdir(CHROMA_BASE_PATH):
            if os.path.isdir(os.path.join(CHROMA_BASE_PATH, name)):
                # Avoid hidden folders/files
                if not name.startswith("."):
                    books.append(name)
    return {"books": books}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    book_name = file.filename[:-4]  # Remove .pdf
    file_path = os.path.join(DATA_PATH, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    chroma_path = os.path.join(CHROMA_BASE_PATH, book_name)
    
    # Process PDF
    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )
        chunks = text_splitter.split_documents(documents)
        
        embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
        Chroma.from_documents(chunks, embeddings, persist_directory=chroma_path)
        
        return {"message": f"Successfully uploaded and processed {file.filename}", "book_name": book_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/api/ask")
def ask_question(req: QuestionRequest):
    try:
        chain = get_or_create_chain(req.book_name)
        response = chain.invoke(
            {"input": req.question},
            config={"configurable": {"session_id": req.session_id}}
        )
        return {
            "session_id": req.session_id,
            "book_name": req.book_name,
            "question": req.question,
            "answer": response["answer"],
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
