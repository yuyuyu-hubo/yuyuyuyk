FROM node:20-slim

WORKDIR /app

# 先只复制 package.json，便于缓存依赖层
COPY package.json ./
RUN npm install

# 再复制其余代码
COPY . .

ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

CMD ["node", "server.js"]
