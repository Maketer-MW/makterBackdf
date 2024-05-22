-- 회원인증 관련 users 테이블

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users(
   user_id uuid PRIMARY KEY DEFAULT
   uuid_generate_v4(),
   user_name VARCHAR(255) NOT NULL,
   user_email VARCHAR(255) NOT NULL,
   user_password VARCHAR(255) NOT NULL
);

-- 가짜 유저 삽입 
insert into users (user_name, user_email,user_password) values ('김헨리','henry123@naver.com', '1234')

-- 유저 조회
select * from users;

