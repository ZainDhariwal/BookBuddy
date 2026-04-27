import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

# Configuration
PDF_PATH = "./data/book.pdf"
CHROMA_PATH = "./chroma_db"
EMBEDDING_MODEL = "nomic-embed-text"

def ingest_pdf():
    # 1. Load PDF
    print(f"Loading PDF from {PDF_PATH}...")
    loader = PyPDFLoader(PDF_PATH)
    documents = loader.load()
    print(f"Loaded {len(documents)} pages.")

    # 2. Split Text into useful chunks
    print("Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split document into {len(chunks)} chunks.")

    # 3. Create Embeddings & Store in Chroma DB
    print(f"Generating embeddings using Ollama ({EMBEDDING_MODEL}) and saving to Chroma...")
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    
    db = Chroma.from_documents(
        chunks, 
        embeddings, 
        persist_directory=CHROMA_PATH
    )
    
    print(f"Saved {len(chunks)} chunks to {CHROMA_PATH}.")
    print("Ingestion complete!")

if __name__ == "__main__":
    if not os.path.exists(PDF_PATH):
        print(f"Error: Could not find PDF file at {PDF_PATH}")
    else:
        ingest_pdf()
