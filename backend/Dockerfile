FROM python:3.11-slim

WORKDIR /app

# Copier requirements et installer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le projet (main.py, my_model.py, etc.)
COPY . .

EXPOSE 8000

# Lancer le serveur
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
