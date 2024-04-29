import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

// 컨트롤러 임포트
import restCtrl from "./app/src/restaurants/restaurants.ctrl.js";
import reviewCtrl from "./app/src/Reviews/review.ctrl.js";
const { Pool } = pkg;
/* 
Postgres cluster makterback2db created
  Username:    postgres
  Password:    vHurqTSDOMLs5jE
  Hostname:    makterbackdf.internal
  Flycast:     fdaa:5:35c8:0:1::16
  Proxy port:  5432
  Postgres port:  5433
  Connection string: postgres://postgres:1nX7mGNmv0HsbSZ@makterback2db.flycast:5432
*/
const pool = new Pool({
  user: "postgres",
  password: "vHurqTSDOMLs5jE",
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
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "token"], // "token" 헤더를 허용합니다.
  })
);

// 예시: get 식당 정보 조회
app.get("/api/v1/restaurants", restCtrl.restrs);

// 예시: 식당 단건 조회
app.get("/api/v1/restaurants/:restaurants_id", restCtrl.restr);

// 예시: 리뷰 생성
app.post("/api/v1/reviews", reviewCtrl.createreview);

// 예시: 리뷰 수정
app.put("/api/v1/reviews/:review_id", reviewCtrl.remotereview);

// 예시: 리뷰 삭제
app.delete("/api/v1/reviews/:review_id", reviewCtrl.deletereview);

// 예시: 특정 식당의 리뷰 목록 조회
app.get("/api/v1/restaurants/:restaurant_id/reviews", reviewCtrl.restreview);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { pool };
