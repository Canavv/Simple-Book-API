import express from "express";
import pg from "pg";
import axios from "axios";
import env from "dotenv";

const app = express();
const port = 5000;

env.config();
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: true,
});

db.connect();

app.use(express.json());

app.get("/api", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error:
        "The server encountered an error and could not complete your request.",
    });
  }
});

app.get("/api/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error:
        "The server encountered an error and could not complete your request.",
    });
  }
});

app.post("/update", async (req, res) => {
  const book = req.body;
  const d = new Date();
  const date = d.toISOString().slice(0, 19).replace("T", " ");

  try {
    const result = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN%3A${book.isbn}&format=json&jscmd=viewapi`
    );
    const url = result.data[`ISBN:${book.isbn}`];
    if (url) {
      await db.query(
        "INSERT INTO books(title, dates, review, isbn, score, info_url, preview_url) VALUES ($1, $2, $3, $4, $5, $6, $7);",
        [
          book.title,
          date,
          book.review,
          book.isbn,
          book.score,
          url.info_url,
          url.preview_url,
        ]
      );
      res.redirect("/");
    } else {
      await db.query(
        "INSERT INTO books(title, dates, review, isbn, score) VALUES ($1, $2, $3, $4, $5);",
        [book.title, date, book.review, book.isbn, book.score]
      );
      res.redirect("/");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      error:
        "The server encountered an error and could not complete your request.",
    });
  }
});

app.post("/update/:id", async (req, res) => {
  const book = req.body;
  const id = req.params.id;
  try {
    await db.query(
      "UPDATE books SET title = $1, review = $2, isbn = $3, score = $4 WHERE id = $5",
      [book.title, book.review, book.isbn, book.score, id]
    );
    res.redirect(`/review/${id}`);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      error:
        "The server encountered an error and could not complete your request.",
    });
  }
});

app.post("/remove/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/");
  } catch (error) {
    res.status(404).json({
      error: "Book not found.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
