FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Assume que o agente é um script de loop ou cron
CMD ["python", "main.py"] 
