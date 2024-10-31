-- reviews 테이블 생성
CREATE TABLE reviews (
   id SERIAL PRIMARY KEY,
   username VARCHAR(100) NOT NULL,
   contents text NOT NULL,
   date DATE NOT NULL,
   rating numeric not null,
   restaurant_id INT NOT NULL REFERENCES restaurants(restaurants_id)
);
-- 로그인한 사용자의 ID 정보도 같이저장 
ADD COLUMN author_id INT REFERENCES users(id);


-- hashtags(해시태그) 테이블 생성
-- 하나의 리뷰안에 여러개의 해시태그가 공동 존재가능하기 때문에 생성함.
create table hashtags (
  id SERIAL PRIMARY KEY,
  contents VARCHAR(32) NOT NULL
)

-- 리뷰-해시태그 매핑 테이블 생성
create table reviews_hashtags (
	reviews_id SERIAL not null,
	hashtags_id SERIAL not null,
	foreign key (reviews_id) references reviews(id) on delete cascade,
	FOREIGN KEY (hashtags_id) REFERENCES hashtags(id) ON DELETE CASCADE
)

-- 리뷰 테이블에 샘플 데이터 삽입
INSERT INTO reviews (username, contents, date, rating, restaurant_id)
VALUES ('John Doe', 'This restaurant is amazing!', '2024-04-12', 4.5, 1);


-- 해시태그 테이블에 샘플 데이터 삽입
INSERT INTO hashtags (contents)
VALUES ('delicious');



-- 리뷰-해시태그 매핑 테이블에 샘플 데이터 삽입
INSERT INTO reviews_hashtags (reviews_id, hashtags_id)
VALUES (1, 1);


-- 작성된 리뷰조회 
SELECT 
    r.id AS review_id,
    r.username,
    r.contents AS review_contents,
    r.date AS review_date,
    r.rating,
    r.restaurant_id,
    h.contents AS hashtag
FROM 
    reviews as r
INNER JOIN
    reviews_hashtags as rh ON r.id = rh.reviews_id
INNER JOIN
    hashtags as h ON rh.hashtags_id = h.id;
