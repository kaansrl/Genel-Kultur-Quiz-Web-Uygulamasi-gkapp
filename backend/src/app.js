// src/app.js
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();
const app = express();

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN, 
    credentials: true,
  })
);

app.use(express.json());

console.log("CLIENT_ORIGIN =", process.env.CLIENT_ORIGIN);
console.log("SESSION_SECRET length =", process.env.SESSION_SECRET?.length);

// Session (Postgres store)
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/", (req, res) => res.send("Backend calisiyor"));

export default app;
