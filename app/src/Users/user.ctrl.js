import { pool } from "../../../app.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";

/* 사용자 회원가입 */
const register = async (req, res) => {
  try {
    const { username, password, email, full_name, phone_number } = req.body;

    // 입력 값 검증
    if (!username || !password || !email) {
      return res.status(400).json({
        resultCode: "F-1",
        msg: "필수 입력 값이 누락되었습니다.",
      });
    }

    console.log("Received Data:", req.body); // 입력 값 확인을 위한 로그

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const { rows } = await pool.query(
      `
        INSERT INTO users (username, password, email, full_name, phone_number) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, full_name, phone_number, created_at
      `,
      [username, hashedPassword, email, full_name, phone_number]
    );

    const newUser = rows[0];

    res.status(201).json({
      resultCode: "S-1",
      msg: "사용자 등록 성공",
      data: newUser,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};
/* end 사용자 회원가입 */

/* 사용자 로그인 */
const login = async (req, res) => {
  try {
    if (req.session && req.session.userId) {
      return res.status(400).json({
        resultCode: "F-3",
        msg: "이미 로그인된 상태입니다.",
      });
    }

    const { username, password } = req.body;

    // 1. 사용자 확인 (DB에서 사용자 정보 조회)
    const { rows } = await pool.query(
      `
          SELECT id, username, password
          FROM users
          WHERE username = $1
        `,
      [username]
    );

    // 사용자가 존재하지 않는 경우
    if (rows.length === 0) {
      return res.status(401).json({
        resultCode: "F-2",
        msg: "존재하지 않는 아이디입니다.",
      });
    }

    const user = rows[0];

    // 비밀번호 확인
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        resultCode: "F-2",
        msg: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }
    // 로그인 성공, 세션 ID 재생성
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ msg: "Session regeneration failed" });
      }

      // 2. 세션에 사용자 ID 저장
      req.session.userId = user.id;

      console.log("세션에 저장된 userId:", req.session.userId); // 디버깅을 위한 로그

      // 3. 세션이 설정된 후 응답을 전송하면, express-session 미들웨어가 쿠키를 자동으로 설정함
      res.json({
        resultCode: "S-1",
        msg: "로그인 성공",
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          created_at: user.created_at,
        },
        sessionId: req.sessionID,
      });
    });
    // 4. 이 시점에서 클라이언트로 쿠키가 전송됨
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};
/* end 사용자 로그인 */

/* 사용자 로그아웃 */
const logout = (req, res) => {
  // 세션이 없거나 이미 로그아웃된 상태인지 확인
  if (!req.session || !req.session.userId) {
    return res.status(400).json({
      resultCode: "F-3",
      msg: "이미 로그아웃된 상태입니다.",
    });
  }

  // 세션 파괴
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        resultCode: "F-1",
        msg: "로그아웃 중 에러 발생",
      });
    }

    // connect.sid 쿠키 삭제
    res.clearCookie("connect.sid", {
      path: "/",
      domain: "localhost", // 도메인과 경로를 정확히 지정
    });

    // _csrf 쿠키 삭제
    res.clearCookie("_csrf", {
      path: "/",
      domain: "localhost", // 도메인과 경로를 정확히 지정
    });

    // 로그아웃 성공 응답 전송
    res.json({
      resultCode: "S-1",
      msg: "로그아웃 성공",
    });
  });
};
/* end 사용자 로그아웃 */

/* 비밀번호 재설정 요청 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        resultCode: "F-2",
        msg: "이메일을 찾을 수 없습니다.",
      });
    }

    const user = rows[0];
    const token = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    console.log("Generated Token:", token);
    console.log("Reset Token Expiry:", resetTokenExpiry);

    await pool.query(
      `
        UPDATE users
        SET reset_password_token = $1, reset_password_expiry = $2
        WHERE id = $3
      `,
      [token, resetTokenExpiry, user.id]
    );

    // Nodemailer 설정
    const transporter = nodemailer.createTransport({
      host: "smtp.naver.com", // 네이버 SMTP 서버
      port: 587, // SMTP 포트 (STARTTLS를 사용하는 경우 587)
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // 네이버 이메일 주소
        pass: process.env.EMAIL_PASS, // 네이버 이메일 비밀번호 또는 앱 비밀번호
      },
    });

    // 비밀번호 재설정 링크
    const resetUrl = `http://localhost:3000/reset-password/${token}`;

    // 이메일 옵션
    const mailOptions = {
      from: "noreply@yourdomain.com",
      to: email,
      subject: "비밀번호 재설정 요청",
      text: `비밀번호 재설정을 위해 아래 링크를 클릭하세요:\n\n${resetUrl}\n\n이 링크는 1시간 후 만료됩니다.`,
    };
    // 이메일 전송
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({
          resultCode: "F-1",
          msg: "이메일 전송 중 오류가 발생했습니다.",
        });
      } else {
        console.log("Email sent: " + info.response);
        res.json({
          resultCode: "S-1",
          msg: "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
        });
      }
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};
/* end 비밀번호 재설정 요청  */

/* 실제 비밀번호 재설정  */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log("Received Token:", token);

    const { rows } = await pool.query(
      `
        SELECT id, reset_password_expiry
        FROM users
        WHERE reset_password_token = $1
      `,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "유효하지 않은 토큰입니다.",
      });
    }

    const user = rows[0];
    console.log("User found:", user);

    if (Date.now() > new Date(user.reset_password_expiry).getTime()) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "토큰이 만료되었습니다.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
        UPDATE users
        SET password = $1, reset_password_token = NULL, reset_password_expiry = NULL
        WHERE id = $2
      `,
      [hashedPassword, user.id]
    );

    res.json({
      resultCode: "S-1",
      msg: "비밀번호 재설정 성공",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};
/* end 실제 비밀번호 재설정  */

/* 사용자 프로필 조회 */
const getProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT id, username, email, full_name, phone_number, created_at
        FROM users
        WHERE id = $1
      `,
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        resultCode: "F-2",
        msg: "사용자를 찾을 수 없습니다.",
      });
    }

    const user = rows[0];

    res.json({
      resultCode: "S-1",
      msg: "프로필 조회 성공",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};
/* end 사용자 프로필 조회  */

/* 사용자 프로필 수정 */
const updateProfile = async (req, res) => {
  try {
    const { email, full_name, phone_number } = req.body;

    const { rows } = await pool.query(
      `
        UPDATE users
        SET email = $1, full_name = $2, phone_number = $3
        WHERE id = $4
        RETURNING id, username, email, full_name, phone_number, created_at
      `,
      [email, full_name, phone_number, req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        resultCode: "F-2",
        msg: "사용자를 찾을 수 없습니다.",
      });
    }

    const updatedUser = rows[0];

    res.json({
      resultCode: "S-1",
      msg: "프로필 수정 성공",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};
/* end 사용자 프로필 수정 */

/* 사용자 세션 상태 확인 */
const checkSession = (req, res) => {
  if (req.session && req.session.userId) {
    // 세션이 존재하고 사용자 ID가 세션에 저장되어 있는 경우
    res.json({
      resultCode: "S-1",
      msg: "세션이 유효합니다.",
      isAuthenticated: true,
    });
  } else {
    // 세션이 없거나 만료된 경우
    res.status(401).json({
      resultCode: "F-2",
      msg: "세션이 만료되었거나 유효하지 않습니다.",
      isAuthenticated: false,
    });
  }
};

/* 사용자 세션 상태 확인 */
export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  checkSession,
};
