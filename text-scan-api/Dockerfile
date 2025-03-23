FROM python:3.9-slim

WORKDIR /app

# Install required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable to use PyTorch
ENV USE_TORCH=1

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY app.py .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "app.py"]
