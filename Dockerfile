# ১. নোডের লাইটওয়েট অ্যালপাইন ইমেজ 
FROM node:20-alpine

# ২. Alpine-এ Prisma চালানোর জন্য OpenSSL প্রয়োজন
RUN apk add --no-cache openssl

# ৩. কন্টেইনারের ভেতরের ফোল্ডার
WORKDIR /app

# ৪. প্যাকেজ ফাইল কপি ও ইন্সটল
COPY package*.json ./
RUN npm install

# ৫. প্রজেক্টের সব কোড কপি
COPY . .

# ৬. Prisma ক্লায়েন্ট জেনারেট করা
RUN npx prisma generate

# ৭. অ্যাপ্লিকেশনের পোর্ট
EXPOSE 5000

# ৮. সার্ভার স্টার্ট কমান্ড
CMD ["npm", "run", "dev"]

