import { pool } from "../../../app.js";

// 다건 조회
const comments = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM comments");
    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

// 단건 조회
const comment = async (req, res) => {
  const commentId = req.params.comment_id; // 경로 파라미터에서 comment_id 가져오기
  try {
    const { rows } = await pool.query(
      "SELECT * FROM comments WHERE comment_id = $1",
      [commentId]
    ); // 쿼리와 파라미터 바인딩
    if (rows.length === 0) {
      return res.status(404).json({
        resultCode: "F-2",
        msg: "댓글을 찾을 수 없습니다",
      });
    }
    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

// 생성
const createcomment = async (req, res) => {
  // 1. 로그인 여부 확인
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }

  try {
    // 2. 클라이언트에서 전달받은 데이터
    const { post_id: postId } = req.params; // 게시물 ID (경로 파라미터에서 가져옴)
    const { comment_text } = req.body; // 댓글 내용

    // 3. 날짜 처리 (클라이언트에서 보내지 않은 경우 서버에서 기본값 생성)
    const comment_date = req.body.comment_date || new Date().toISOString();

    // 4. 세션에서 사용자 정보 가져오기
    const username = req.session.username; // 댓글 작성자 이름
    const userId = req.session.userId; // 댓글 작성자 ID

    // 5. 댓글 저장 쿼리
    const query = `
      INSERT INTO comments (post_id, comment_text, comment_date, username, author_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [postId, comment_text, comment_date, username, userId];

    // 6. 데이터베이스에 저장
    const { rows } = await pool.query(query, values);

    // 7. 응답 반환
    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows[0], // 저장된 댓글 데이터 반환
    });
  } catch (error) {
    console.error("댓글 생성 중 에러:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "댓글 생성 중 에러 발생",
    });
  }
};

// 삭제
const deletecomment = async (req, res) => {
  // 로그인 확인
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }

  const { post_id, commentid } = req.params; // post_id와 commentid를 경로 파라미터로 받음
  const userId = req.session.userId; // 세션에서 로그인된 사용자 ID 가져오기

  // 유효성 검사
  if (!post_id || !commentid) {
    return res.status(400).json({
      resultCode: "F-1",
      msg: "post_id 또는 commentid가 누락되었습니다.",
    });
  }

  try {
    // 댓글 삭제 쿼리
    const query = `
      DELETE FROM comments
      WHERE post_id = $1 AND id = $2 AND author_id = $3
      RETURNING *;
    `;
    const values = [post_id, commentid, userId];

    // 쿼리 실행
    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      // 성공적으로 삭제된 경우
      res.json({
        resultCode: "S-1",
        msg: "댓글 삭제 성공",
        data: result.rows[0],
      });
    } else {
      // 삭제할 댓글을 찾을 수 없는 경우
      res.status(404).json({
        resultCode: "F-2",
        msg: "해당 댓글을 찾을 수 없습니다.",
      });
    }
  } catch (error) {
    // 예외 처리
    console.error("댓글 삭제 중 에러 발생:", error);
    res.status(500).json({
      resultCode: "F-3",
      msg: "댓글 삭제 중 에러 발생",
    });
  }
};

// 댓글 가져오기
const getCommentsByPostId = async (req, res) => {
  const { postId } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM comments WHERE post_id = $1",
      [postId]
    );
    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

export default {
  comments,
  comment,
  createcomment,
  deletecomment,
  getCommentsByPostId,
};
