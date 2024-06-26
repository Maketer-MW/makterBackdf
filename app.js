import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

// 컨트롤러 임포트
import restCtrl from "./app/src/restaurants/restaurants.ctrl.js";
import reviewCtrl from "./app/src/Reviews/review.ctrl.js";
import CumintyCtrl from "./app/src/Cuminte/Cuminty.ctrl.js";
import CommentsCtrl from "./app/src/Cuminte/Comments.ctrl.js";
const { Pool } = pkg;
/* 
Postgres cluster makterback created
   Username:    postgres
    Password:    qAH7KXJjlLFpgH6
    Hostname:    makterdb.internal
    Flycast:     fdaa:5:35c8:0:1::22
    Proxy port:  5432
    Postgres port:  5433
    Connection string: postgres://postgres:qAH7KXJjlLFpgH6@makterdb.flycast:5432
  */

const pool = new Pool({
  user: "postgres",
  password: "qAH7KXJjlLFpgH6",
  host: "127.0.0.1",
  database: "postgres",
  port: 5432,
});

const app = express();
dotenv.config();

// 기본 설정
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "token"], // "token" 헤더를 허용합니다.
  })
);

// 식당 정보 다건 조회
app.get("/api/v1/restaurants", restCtrl.restrs);

// 식당 단건 조회
app.get("/api/v1/restaurants/:restaurants_id", restCtrl.restr);

// 예시 : 특정 카테고리의 식당 정보 조회
app.get("/api/v1/restaurants/category/:category", restCtrl.restc);

// 예시: 리뷰 생성
app.post("/api/v1/reviews", reviewCtrl.createreview);

// 예시: 리뷰 삭제
app.delete("/api/v1/reviews/:review_id", reviewCtrl.deletereview);

// 식당별 리뷰 조회
app.get("/api/v1/reviews/:restaurant_id", reviewCtrl.getReviews);

// 예시: 특정 식당의 리뷰 목록 조회
app.get("/api/v1/restaurants/reviews", reviewCtrl.restreview);

app.get("/api/tags", reviewCtrl.getHashtags);

// 커뮤니티 포스트 다건 조회
app.get("/api/v1/posts", CumintyCtrl.posts);

// 커뮤니티 포스트 단건 조회
app.get("/api/v1/post/:post_id", CumintyCtrl.post);

// 커뮤니티 포스트 생성
app.post("/api/v1/post", CumintyCtrl.createpost);

// 커뮤니티 포스트 수정
app.put("/api/v1/post/:post_id", CumintyCtrl.remotepost);

// 커뮤니티 포스트 삭제
app.delete("/api/v1/post/:post_id", CumintyCtrl.deletepost);

// 댓글 다건 조회
app.get("/api/v1/comments", CommentsCtrl.comments);

// 댓글 단건 조회
app.get("/api/v1/comments/:commentId", CommentsCtrl.comment);

// 댓글 생성
app.post("/api/v1/post/:post_id/comments", CommentsCtrl.createcomment);

// 댓글 삭제
app.delete(
  "/api/v1/post/:post_id/comments/:commentid",
  CommentsCtrl.deletecomment
);

// 특정 포스트에 대한 댓글 조회
app.get("/api/v1/post/:postId/comments", CommentsCtrl.getCommentsByPostId);

app.get("/", (req, res) => {
  res.send("Hello World!");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { pool };
