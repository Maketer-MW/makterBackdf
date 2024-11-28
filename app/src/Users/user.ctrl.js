import { pool } from "../../../app.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pkg from "solapi"; // solapi 모듈 전체를 임포트
import dotenv from "dotenv";
dotenv.config();

const { SolapiMessageService } = pkg; // 필요한 서비스만 가져옴

// SOLAPI 초기화
const messageService = new SolapiMessageService(
  "NCSCH0ELAKJCOIUA",
  "CCB7GHK07T4HBBND66IYR61H3EUMLLRK"
);
// 전화번호 인증코드 발송
const sendVerificationCode = async (req, res) => {
  const { phone_number } = req.body;

  // 전화번호 확인
  if (!phone_number) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "전화번호가 누락되었습니다.",
    });
  }

  // 6자리 인증코드 생성
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  try {
    const response = await messageService.send({
      to: phone_number,
      from: "010-2848-5397",
      text: `인증코드: ${verificationCode}`,
    });

    console.log("CoolSMS API Response:", response); // CoolSMS 응답 출력

    if (response.error_list && response.error_list.length > 0) {
      console.error("CoolSMS API Error:", response.error_list); // 에러 리스트 출력
      return res.status(500).json({
        resultCode: "F-2",
        msg: "SMS 전송 중 에러가 발생했습니다.",
        error: response.error_list,
      });
    }

    return res.status(200).json({
      resultCode: "S-1",
      msg: "인증코드가 성공적으로 전송되었습니다.",
      verificationCode,
    });
  } catch (error) {
    console.error("Unexpected Error:", error); // 예외 처리
    return res.status(500).json({
      resultCode: "F-1",
      msg: "서버 에러 발생",
      error: error.message,
    });
  }
};

// 인증코드 검증
const verifyCode = (req, res) => {
  const { verificationCode, inputCode } = req.body;

  console.log("Stored code:", verificationCode); // 서버에서 저장된 인증코드
  console.log("User input code:", inputCode); // 사용자가 입력한 인증코드

  if (verificationCode !== inputCode) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "인증코드가 일치하지 않습니다.",
    });
  }

  return res.status(200).json({
    resultCode: "S-1",
    msg: "인증이 완료되었습니다.",
  });
};

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

    // 사용자 이름 중복 체크
    const { rows: existingUsers } = await pool.query(
      `SELECT id FROM users WHERE username = $1 OR email = $2`,
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "이미 사용 중인 사용자 이름 또는 이메일입니다.",
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
    const { username, password } = req.body;

    const { rows } = await pool.query(
      `
        SELECT id, username, password, email, full_name, phone_number, created_at
        FROM users
        WHERE username = $1
      `,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        resultCode: "F-2",
        msg: "존재하지 않는 아이디입니다.",
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        resultCode: "F-2",
        msg: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    req.session.save((err) => {
      if (err) {
        console.error("세션 저장 중 에러 발생:", err);
        return res.status(500).json({
          resultCode: "F-1",
          msg: "세션 저장 중 에러 발생",
        });
      }

      // 세션 저장 성공 후 응답
      res.json({
        resultCode: "S-1",
        msg: "로그인 성공",
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone_number: user.phone_number,
          created_at: user.created_at,
        },
        sessionId: req.sessionID,
      });
    });
  } catch (error) {
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
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        resultCode: "F-1",
        msg: "로그아웃 중 에러 발생",
      });
    }

    res.clearCookie("connect.sid", {
      path: "/",
      secure: process.env.NODE_ENV === "production", // HTTPS 환경에서만 secure 쿠키 허용
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 개발 환경에서는 lax, 배포 환경에서는 none
      maxAge: 0, // 쿠키 즉시 만료
    });

    console.log("세션이 성공적으로 파괴되었습니다.");
    res.json({
      resultCode: "S-1",
      msg: "로그아웃 성공",
    });
  });
};
/* end 사용자 로그아웃 */

/* 비밀번호 재설정 */
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

    // 이메일 전송 로직 추가 (예: nodemailer)

    res.json({
      resultCode: "S-1",
      msg: "비밀번호 재설정 요청 성공. 이메일을 확인하세요.",
      token: token, // 응답에 토큰 포함 (개발 및 테스트용)
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
/* end 비밀번호 재설정  */

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

/* 사용자 세션 상태 유지*/
/* 사용자 세션 상태 유지 */
const checkSession = async (req, res) => {
  console.log("세션 데이터 확인:", req.session); // 세션 데이터 확인

  if (req.session && req.session.userId) {
    try {
      // 데이터베이스에서 사용자 정보 조회
      const { rows } = await pool.query(
        `
          SELECT id, username, email, full_name, phone_number, created_at
          FROM users
          WHERE id = $1
        `,
        [req.session.userId]
      );

      if (rows.length === 0) {
        return res.status(401).json({
          resultCode: "F-2",
          msg: "세션이 만료되었거나 유효하지 않습니다.",
          isAuthenticated: false,
        });
      }

      const user = rows[0];

      console.log("세션 유효함. 사용자 ID:", req.session.userId);
      return res.status(200).json({
        resultCode: "S-1",
        msg: "세션이 유효합니다.",
        isAuthenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error("세션 확인 중 에러 발생:", error);
      return res.status(500).json({
        resultCode: "F-1",
        msg: "서버 에러 발생",
        isAuthenticated: false,
      });
    }
  } else {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "세션이 만료되었거나 유효하지 않습니다.",
      isAuthenticated: false,
    });
  }
};
/* end 사용자 세션 상태 유지 */

/* end 사용자 세션 상태 유지*/
export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  checkSession,
  sendVerificationCode,
  verifyCode,
};
