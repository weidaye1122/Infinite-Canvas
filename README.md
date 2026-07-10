# Infinite Canvas
`Infinite Canvas` 是一个适合自托管的在线白板应用，基于 `Excalidraw Persist` 深度定制，支持服务端持久化、多画板管理，以及更适合个人使用的单密码访问方式。
## 群晖 Compose
```yaml
services:
  infinite-canvas:
    container_name: infinite-canvas # 容器名称
    image: ghcr.io/weidaye1122/infinite-canvas:latest # 也可以改成 weidaye1122/infinite-canvas:latest
    restart: unless-stopped
    ports:
      - "8180:80" # 前端访问端口，浏览器打开 http://群晖IP:8180
      - "4001:4000" # 后端 API 端口，方便排查或反代
    environment:
      NODE_ENV: production
      PORT: 4000
      DB_PATH: /app/data/database.sqlite # SQLite 数据库文件位置
      LOGIN_PASSWORD: 改成你自己的访问密码 # 登录密码
      LOGIN_SESSION_SECRET: 改成更长的随机字符串 # 会话签名密钥
    volumes:
      - /volume1/docker/infinite-canvas/data:/app/data # 持久化数据目录，重建容器后数据不会丢
```
