# Use Node.js official image
FROM node:14-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install all dependencies, including react-chartjs-2 and chart.js
RUN npm install

# Copy the rest of the application code
COPY . .

# Install react-chartjs-2 and chart.js explicitly to ensure availability
#RUN npm install react-chartjs-2 chart.js

# Build the React application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
