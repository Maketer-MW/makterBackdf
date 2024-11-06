-- 커뮤니티 관련 글 posts 테이블 생성
CREATE TABLE posts (
   post_id SERIAL PRIMARY KEY,
   title VARCHAR(100) NOT NULL,
   content TEXT NOT NULL,
   post_date TIMESTAMP NOT NULL
);

SELECT * FROM posts;

-- 게시물 작성자의 사용자 ID를 저장하기 위한 author_id 속성 추가
ALTER TABLE posts
ADD COLUMN author_id INT REFERENCES users(id);

-- 게시물 작성자의 이름을 저장하기 위한 username 속성 추가
ALTER TABLE posts
ADD COLUMN username VARCHAR(100) DEFAULT 'unknown' NOT NULL;

INSERT INTO posts (title, content, post_date) VALUES ('테스트 제목', '테스트 내용', '2023-05-11T12:00:00Z') RETURNING *;

-- 커뮤니티 댓글 관련 comments 테이블 생성
CREATE TABLE comments (
   id SERIAL PRIMARY KEY,
   comment_text CHAR(100) NOT NULL,
   comment_date CHAR(100) NOT NULL,
   user_id uuid NOT NULL REFERENCES users(user_id),
   post_id INT NOT NULL REFERENCES posts(post_id)
);
