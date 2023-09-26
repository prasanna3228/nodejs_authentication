const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { error } = require("console");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// get all books
app.get("/books", async (req, res) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("invalid access token");
  } else {
    jwt.verify(jwtToken, "asaadfghjkl", async (error, user) => {
      if (error) {
        res.status(502).send("Invalid Access Token");
      } else {
        const getBookQuery = `
    select * from book `;
        const bookArray = await db.all(getBookQuery);
        res.send(bookArray);
      }
    });
  }
});

//get book
app.get("/books/:id/", async (req, res) => {
  const { id } = req.params;
  const getSingleBookQuery = `
  select * from book where id=${id}`;
  const singleBookArray = await db.get(getSingleBookQuery);
  res.send(singleBookArray);
});

// add book API

app.post("/book/", async (req, res) => {
  const bookDetails = req.body;
  const { id, name, author } = bookDetails;

  const addBook = `
  insert into book values (${id}, "${name}", "${author}");`;
  const addBookArray = await db.run(addBook);
  res.send(addBookArray);
});

// update book details

app.put("/books/:id/", async (req, res) => {
  const { id } = req.params;
  const bookDetails = req.body;
  const { name, author } = bookDetails;
  const updateBookQuery = `update  book 
  set

  name='${name}',
  author='${author}'
  where id=${id}; `;
  await db.run(updateBookQuery);
  res.send("book updated successfully");
});

// detele book

app.delete("/books/:id/", async (req, res) => {
  const { id } = req.params;
  const deleteBook = `DELETE FROM book WHERE id=${id}`;
  await db.run(deleteBook);
  res.send("BOOK DELETED SUCCESSFULLY");
});

// Get only book authors

app.get("/books_authors/", async (req, res) => {
  const getAuthors = `select author from book`;
  const allAuthorNames = await db.all(getAuthors);
  res.send(allAuthorNames);
});

//authenticatiov
//create user API

// app.post("/users/", async (req, res) => {
//   const { username, name, password, gender, location } = req.body;
//   const hashedPassword = await bcrypt.hash(req.body.password, 10);
//   const selectUserQuery = `
//   select * from user
//   where username ='${username}';
//   `;
//   const dbUser = await db.get(selectUserQuery);
//   if (dbUser === undefined) {
//     //create user name in user table
//     const createNewUser = `
//     insert into user(username,name,password,gender,location)
//      values(
//       '${name}'
//       '${username}',
//       '${hashedPassword}',
//       '${gender}',
//       '${location}');`;
//     await db.run(createNewUser);
//     res.send("user created successfully");
//   } else {
//     //send invalid username as response
//     res.status(400);
//     res.send("usename alredy exist");
//   }
// });

//creating user API

app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

// login....

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const selectUserQuery = `
  select * from user where username='${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    // user doesn't exist
    res.status(400);
    res.send("Invalid user");
  } else {
    // compare password hashed password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      res.send("Login success!");
    } else {
      res.send("invalid password");
    }
  }
});

// login using jwt token
app.post("/loginjwt", async (req, res) => {
  const { username, password } = req.body;
  const selectUserQuery = `
  select * from user where username='${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    // user doesn't exist
    res.status(400);
    res.send("Invalid user");
  } else {
    // compare password hashed password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "asaadfghjkl");
      res.send({ jwtToken });
    } else {
      res.send("invalid password");
    }
  }
});
