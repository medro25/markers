# Use a Python base image for the backend
FROM python:3.9

# Install system dependencies including curl, wget, and the required libpugixml1v5
RUN apt-get update && \
    apt-get install -y curl wget libpugixml1v5

# Download and install liblsl
RUN curl --retry 5 --retry-connrefused -L -o /tmp/liblsl-1.16.2-focal_amd64.deb \
    https://github.com/sccn/liblsl/releases/download/v1.16.2/liblsl-1.16.2-focal_amd64.deb \
    && dpkg -i /tmp/liblsl-1.16.2-focal_amd64.deb || (echo "Failed to install liblsl" && exit 1) \
    && rm /tmp/liblsl-1.16.2-focal_amd64.deb

## Copy the Python requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .
# Expose the WebSocket port
EXPOSE 8765
# Set the default command to run the Python app
CMD ["python", "app.py"]