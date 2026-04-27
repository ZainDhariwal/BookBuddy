.PHONY: install run stop clean
.DEFAULT_GOAL := run

install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Frontend installed."
	@echo "Setting up Python virtual environment and installing backend dependencies..."
	python3 -m venv venv
	./venv/bin/pip install -r backend/requirements.txt
	@echo "Backend installed."

run: stop
	@echo "==============================="
	@echo "Starting Full RAG Stack..."
	@echo "==============================="
	@if [ ! -d "venv" ]; then echo "Virtual environment not found. Running 'make install' first..."; make install; fi
	@bash -c "source venv/bin/activate && cd backend && uvicorn main:app --reload > ../uvicorn.log 2>&1 &"
	@echo "[Backend] Running on http://127.0.0.1:8000"
	@bash -c "cd frontend && npm run dev > ../frontend_server.log 2>&1 &"
	@echo "[Frontend] Running on http://localhost:5173"
	@echo "Both processes are now running in the background."

stop:
	@echo "Stopping servers if they are running..."
	@pkill -f uvicorn || true
	@pkill node || true
	@echo "Servers stopped."

clean: stop
	@echo "Cleaning up generated logs..."
	@rm -f uvicorn.log start_server.log frontend_server.log
	@echo "Project cleaned."
