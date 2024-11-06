import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import session from "express-session";

// 컨트롤러 임포트
import restCtrl from "./app/src/restaurants/restaurants.ctrl.js";
import reviewCtrl from "./app/src/Reviews/review.ctrl.js";
import CumintyCtrl from "./app/src/Cuminte/Cuminty.ctrl.js";
import CommentsCtrl from "./app/src/Cuminte/Comments.ctrl.js";
import userCtrl from "./app/src/Users/user.ctrl.js";

const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  user: "postgres",
  password: "qAH7KXJjlLFpgH6",
  host: "makterdb.internal",
  database: "postgres",
  port: 5432,
});

// makterdb.internal
const app = express();

// 기본 설정
app.use(express.json());

app.set("trust proxy", 1); // 프록시 신뢰 설정

// express-session 미들웨어 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS 환경에서만 secure 쿠키 허용
      httpOnly: false, // 클라이언트에서 쿠키 접근 불가
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 개발 환경에서는 lax, 배포 환경에서는 none
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1주일
    },
  })
);

app.use(
  cors({
    origin: "http://localhost:5173", // 클라이언트가 실행 중인 도메인
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // 세션 쿠키 포함 허용
  })
);

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log("Response Headers:", res.getHeaders());
  });
  next();
});

// 로그인 체크 미들웨어
const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }
};

/**
 * =========================
 * 1. 레스토랑 관련 API
 * =========================
 */
app.get("/api/v1/restaurants", restCtrl.restrs); // 모든 레스토랑 조회
app.get("/api/v1/restaurants/:restaurants_id", restCtrl.restr); // 특정 레스토랑 조회
app.get("/api/v1/restaurants/category/:category", restCtrl.restc); // 카테고리별 레스토랑 조회

/**
 * =========================
 * 2. 리뷰 관련 API
 * =========================
 */
app.post("/api/v1/reviews", isLoggedIn, reviewCtrl.createreview); // 리뷰 생성 (로그인 필요)
app.delete("/api/v1/reviews/:review_id", isLoggedIn, reviewCtrl.deletereview); // 리뷰 삭제 (로그인 필요)
app.get("/api/v1/reviews/:restaurant_id", reviewCtrl.getReviews); // 특정 레스토랑의 리뷰 조회
app.get("/api/v1/restaurants/reviews", reviewCtrl.restreview); // 레스토랑 리뷰 조회
app.get("/api/tags", reviewCtrl.getHashtags); // 해시태그 조회

/**
 * =========================
 * 3. 사용자 (회원) 관련 API
 * =========================
 */
app.post("/api/v1/register", userCtrl.register); // 회원가입
app.post("/api/v1/login", userCtrl.login); // 로그인
app.post("/api/v1/logout", userCtrl.logout); // 로그아웃
app.post("/api/v1/reset-password", userCtrl.requestPasswordReset); // 비밀번호 재설정 요청
app.post("/api/v1/reset-password/:token", userCtrl.resetPassword); // 비밀번호 재설정
app.get("/api/v1/check-session", userCtrl.checkSession); // 세션 상태 확인
app.get("/api/v1/profile", isLoggedIn, userCtrl.getProfile); // 프로필 조회 (로그인 필요)
app.put("/api/v1/profile", isLoggedIn, userCtrl.updateProfile); // 프로필 수정 (로그인 필요)

/**
 * =========================
 * 4. SOLAPI API 관련 API
 * =========================
 */
app.post("/api/v1/send-verification-code", userCtrl.sendVerificationCode); // SMS 인증코드 전송
app.post("/api/v1/verify-code", userCtrl.verifyCode); // SMS 인증코드 확인

/**
 * =========================
 * 5. 커뮤니티 게시글 관련 API
 * =========================
 */
app.get("/api/v1/posts", CumintyCtrl.posts); // 게시글 전체 조회
app.get("/api/v1/post/:post_id", CumintyCtrl.post); // 특정 게시글 조회
app.post("/api/v1/post", isLoggedIn, CumintyCtrl.createpost); // 게시글 작성 (로그인 필요)
app.put("/api/v1/post/:post_id", isLoggedIn, CumintyCtrl.remotepost); // 게시글 수정 (로그인 필요)
app.delete("/api/v1/post/:post_id", isLoggedIn, CumintyCtrl.deletepost); // 게시글 삭제 (로그인 필요)

/**
 * =========================
 * 6. 댓글 관련 API
 * =========================
 */
app.get("/api/v1/comments", CommentsCtrl.comments); // 모든 댓글 조회
app.get("/api/v1/comments/:commentId", CommentsCtrl.comment); // 특정 댓글 조회
app.post(
  "/api/v1/post/:post_id/comments",
  isLoggedIn,
  CommentsCtrl.createcomment
); // 댓글 작성 (로그인 필요)
app.delete(
  "/api/v1/post/:post_id/comments/:commentid",
  isLoggedIn,
  CommentsCtrl.deletecomment
); // 댓글 삭제 (로그인 필요)
app.get("/api/v1/post/:postId/comments", CommentsCtrl.getCommentsByPostId); // 특정 게시글의 댓글 조회

/**
 * =========================
 * 7. 기본 라우트
 * =========================
 */
app.get("/", (req, res) => {
  res.send("Hello World!");
});

/**
 * =========================
 * 서버 실행
 * =========================
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { pool };
