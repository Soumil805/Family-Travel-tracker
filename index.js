import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

import dotenv from "dotenv";
dotenv.config();


const app = express();
const port = 3000;



const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

//just to visualize how the content will be
let users = [
  { id: 1, name: "soumil", color: "teal" },
  { id: 2, name: "bhavesh", color: "powderblue" },
];

//for highlighting the visited countries
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries join users ON users.id = user_id where user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
};

//getting the data of the current user from the table 
async function getCurrentUser() {
  const result = await db.query("SELECT * From users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId); 
}

//initial front page and the home page
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const user = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: user.color,
  });
});

//adding the countries for the user
app.post("/add", async (req, res) => {
  const input = req.body["country"];
   try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//selecting another user or clicking on new user
app.post("/user", async (req, res) => {
  if (req.body.add === "new"){
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

//adding the new user
app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query("Insert Into users (name, color) values($1, $2) Returning *", 
    [name, color]
  );
  const id = result.rows[0].id;
  currentUserId = id;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
