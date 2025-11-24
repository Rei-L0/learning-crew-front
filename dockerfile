# 가벼운 웹 서버인 Nginx를 사용합니다.
FROM nginx:alpine

# 현재 폴더의 모든 파일(HTML, CSS, JS 등)을 Nginx의 웹 루트로 복사합니다.
COPY . /usr/share/nginx/html

# Nginx 설정을 커스텀할 필요가 없다면 기본 설정으로 80 포트에서 실행됩니다.
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]