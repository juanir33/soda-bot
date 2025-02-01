# 1. Imagen base
FROM node:22

# 2. Instalar Python y las dependencias
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv 

# 3. Establecer el directorio de trabajo
WORKDIR /app

# 4. Copiar los archivos de la aplicación
COPY package*.json ./
RUN yarn install
COPY . .

## 5. Crear y activar un entorno virtual
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# 6. Instalar las dependencias de Python dentro del entorno virtual
RUN pip install -r /app/requirements.txt

# 6. Construir la aplicación NestJS
RUN yarn build

# 7. Exponer el puerto 3000 para la aplicación NestJS
EXPOSE 3000

# 8. Comando para iniciar la aplicación
CMD ["node", "dist/main.js"]
