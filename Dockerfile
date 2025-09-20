FROM node:23-alpine

WORKDIR /app

# Copia package.json
COPY package.json ./

# Installa tutte le dipendenze (anche dev per ts-node)
RUN npm install

# Copia tutto il resto
COPY . .

# Esponi la porta
EXPOSE 4005

# Per non avviare mod. REPL 
ENV DOCKER_CONTAINER=true 

# Runna direttamente in sviluppo con ts-node
CMD ["npm", "run", "dev"]
