import pkg from "pg";
import { pool } from "../../../app.js";

const createreview = async (req, res) => {
  try {
    const { restaurant_id, contents, username, rating } = req.body;
    const date = new Date().toISOString().slice(0, 10); // 현재 날짜를 ISO 형식으로 가져와서 YYYY-MM-DD 형식으로 변환

    const { rows } = await pool.query(
      `
        INSERT INTO reviews (restaurant_id, contents, date, rating, username) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
      [restaurant_id, contents, date, rating, username]
    );
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

const remotereview = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id, contents, username, rating } = req.body;
    const { rows } = await pool.query(
      `
        UPDATE reviews 
        SET restaurant_id = $1, contents = $2, review_date = CURRENT_TIMESTAMP, username = $4 , rating = $5 
        WHERE id = $6
        RETURNING *
        `,
      [restaurant_id, contents, username, rating]
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

const deletereview = async (req, res) => {
  try {
    const { review_id } = req.params;
    const { rows } = await pool.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING *",
      [review_id]
    );

    if (rows.length > 0) {
      res.json({
        resultCode: "S-1",
        msg: "성공",
        data: rows[0],
      });
    } else {
      res.status(404).json({
        resultCode: "F-1",
        msg: "해당 리뷰를 찾을 수 없습니다.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

// 모든 리뷰조회
const getAllReviews = async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const reviews = await pool.query(
      `
      SELECT 
          r.id AS review_id,
          r.username,
          r.contents AS review_contents,
          r.date AS review_date,
          r.rating,
          r.restaurant_id,
          array_agg(h.contents) AS hashtags
      FROM 
          reviews AS r
      LEFT JOIN
          reviews_hashtags AS rh ON r.id = rh.reviews_id
      LEFT JOIN
          hashtags AS h ON rh.hashtags_id = h.id
      GROUP BY
          r.id
    `,
      [restaurant_id]
    );
    res.json({
      resultCode: "S-1",
      msg: "Success",
      data: reviews.rows,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "Error fetching reviews",
      error: error.message,
    });
  }
};

//사용자 리뷰
const userreview = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM reviews WHERE user_id = $1",
      [user_id]
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

//식당 리뷰
const restreview = async (req, res) => {
  try {
    // const { restaurant_id } = req.params;
    const reviews = await pool.query(
      `SELECT r.*, array_agg(h.contents) AS hashtags
       FROM reviews AS r
       LEFT JOIN reviews_hashtags AS rh ON r.id = rh.reviews_id
       LEFT JOIN hashtags AS h ON rh.hashtags_id = h.id
       GROUP BY r.id`,
      [] // restaurant_id 매개변수 전달
    );
    res.json({
      resultCode: "S-1",
      msg: "Success",
      data: reviews.rows,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "Error fetching reviews",
      error: error.message,
    });
  }
};

export default {
  createreview,
  remotereview,
  deletereview,
  getAllReviews,
  userreview,
  restreview,
};
