-- users 테이블 생성
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(100),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 추가 속성
ALTER TABLE users
ADD COLUMN reset_password_token VARCHAR(100),
ADD COLUMN reset_password_expiry TIMESTAMP;

-- 유저들의 id를 저장해둘 username 속성이름을 보다 명확하게 변환 username -> user_id
ALTER TABLE users RENAME COLUMN username TO user_id;

-- 가짜 유저 삽입 
insert into users (user_name, user_email,user_password) values ('김헨리','henry123@naver.com', '1234')

-- 유저 조회
select * from users;

