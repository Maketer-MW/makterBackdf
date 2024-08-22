import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import session from "express-session";
import csrf from "csurf";
import cookieParser from "cookie-parser"; // 쿠키 파서 추가

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
  host: "127.0.0.1",
  database: "postgres",
  port: 5432,
});

const app = express();

// 기본 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // bodyParser.urlencoded 대신 사용
app.use(cookieParser()); // 쿠키 파서 설정

app.use(
  cors({
    origin: "http://localhost:5173", // 클라이언트의 도메인 및 포트
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true, // 쿠키 포함 여부
    allowedHeaders: ["Content-Type", "Authorization", "token", "X-CSRF-Token"],
  })
);

// express-session 미들웨어 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "Lax", // Lax, Strict, None 중 선택 (테스트 환경에 따라 None으로 설정)
      maxAge: 1000 * 60 * 60 * 1, // 1시간 동안 세션 유지 (1000ms * 60s * 60m)
    },
  })
);

// CSRF 보호 미들웨어 설정
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// CSRF 토큰을 클라이언트에 제공하는 엔드포인트 추가
app.get("/api/v1/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
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

// API 라우트 정의
app.get("/api/v1/restaurants", restCtrl.restrs);
app.get("/api/v1/restaurants/:restaurants_id", restCtrl.restr);
app.get("/api/v1/restaurants/category/:category", restCtrl.restc);
app.post("/api/v1/reviews", isLoggedIn, reviewCtrl.createreview);
app.delete("/api/v1/reviews/:review_id", isLoggedIn, reviewCtrl.deletereview);
app.get("/api/v1/reviews/:restaurant_id", reviewCtrl.getReviews);
app.get("/api/v1/restaurants/reviews", reviewCtrl.restreview);
app.get("/api/tags", reviewCtrl.getHashtags);
app.post("/api/v1/register", userCtrl.register);
app.post("/api/v1/login", userCtrl.login);
app.post("/api/v1/logout", csrfProtection, userCtrl.logout);
app.post("/api/v1/reset-password", userCtrl.requestPasswordReset);
app.post("/api/v1/reset-password/:token", userCtrl.resetPassword);
app.get("/api/v1/check-session", userCtrl.checkSession);
app.get("/api/v1/profile", isLoggedIn, userCtrl.getProfile);
app.put("/api/v1/profile", isLoggedIn, userCtrl.updateProfile);
app.get("/api/v1/posts", CumintyCtrl.posts);
app.get("/api/v1/post/:post_id", CumintyCtrl.post);
app.post("/api/v1/post", isLoggedIn, CumintyCtrl.createpost);
app.put("/api/v1/post/:post_id", isLoggedIn, CumintyCtrl.remotepost);
app.delete("/api/v1/post/:post_id", isLoggedIn, CumintyCtrl.deletepost);
app.get("/api/v1/comments", CommentsCtrl.comments);
app.get("/api/v1/comments/:commentId", CommentsCtrl.comment);
app.post(
  "/api/v1/post/:post_id/comments",
  isLoggedIn,
  CommentsCtrl.createcomment
);
app.delete(
  "/api/v1/post/:post_id/comments/:commentid",
  isLoggedIn,
  CommentsCtrl.deletecomment
);
app.get("/api/v1/post/:postId/comments", CommentsCtrl.getCommentsByPostId);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { pool };
