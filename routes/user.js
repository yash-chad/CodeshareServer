const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db/mysql");
const { auth } = require("../middleware/auth");
const { saltRounds, jwtSecret } = require("../config");
const { Router } = require("express");
const router = Router();

// Get all users from the db
router.get("/getUsers", auth, (req, res) => {
  let sql = "SELECT * FROM user";
  db.query(sql, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

router.post("/register", async (req, res) => {
  try {
    if (
      !req.body.first_name ||
      !req.body.last_name ||
      !req.body.email ||
      !req.body.password
    ) {
      return res.send({
        Error: "Please insert all fields",
      });
    }

    const encryptedPassword = await bcrypt.hash(
      req.body.password,
      parseInt(saltRounds)
    );

    const newUser = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      phone: req.body.phone,
      password: encryptedPassword,
    };

    let checkUserQuery = `SELECT count(*) AS 'count' FROM user WHERE email='${req.body.email}'`;
    db.query(checkUserQuery, async (err, result) => {
      // Checking if the user aldready exists
      if (result[0].count) {
        return res.status(401).send({
          Error: "User Aldready exists, try logging in!!",
        });
      } else {
        db.query("INSERT INTO user SET ?", newUser, (error, results) => {
          if (error) {
            res.status(400).send({
              Error: error,
            });
          } else {
            res.status(201).send({
              success: "user registered sucessfully",
            });
          }
        });
      }
    });
  } catch (e) {
    console.log(e);
    res.send(e);
  }
});

router.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.send({
      Error: "Please insert all fields",
    });
  }
  const email = req.body.email;
  const password = req.body.password;

  db.query(
    "SELECT * FROM user WHERE email = ?",
    [email],
    async (error, results) => {
      if (error) {
        res.status(400).send({
          Error: error,
        });
      } else {
        if (results.length > 0) {
          const comparision = await bcrypt.compare(
            password,
            results[0].password
          );
          if (comparision) {
            // Correct credintials
            const token = jwt.sign(
              {
                user_id: results[0].user_id,
              },
              jwtSecret
            );

            delete results[0].password;
            res.status(200).send({
              success: "Login sucessfull",
              token,
              user: results[0],
            });
          } else {
            res.status(400).send({
              message: "Invalid credintials",
            });
          }
        } else {
          res.send({
            code: 206,
            success: "Email does not exits",
          });
        }
      }
    }
  );
});

//A route to verify user's token stored in the browser
router.post("/verifyToken", async (req, res) => {
  try {
    const token = req.body.token;
    const decoded = await jwt.verify(token, jwtSecret);

    await db.query(
      `SELECT * FROM user WHERE user_id = ${decoded.user_id}`,
      (error, result) => {
        if (error || !result.length) {
          throw error;
        } else {
          req.user = result[0];
          delete result[0].password;
          res.status(200).send({
            success: "Login sucessfull",
            token,
            user: result[0],
          });
        }
      }
    );
  } catch (err) {
    return res.status(400).send({ error: "Please Authenticate!" });
  }
});

router.post("/getCurrentUser", async (req, res) => {
  try {
    const token = req.body.token;
    const decoded = await jwt.verify(token, jwtSecret);

    await db.query(
      `SELECT * FROM user WHERE user_id = ${decoded.user_id}`,
      (error, result) => {
        if (error || !result.length) {
          throw error;
        } else {
          req.user = result[0];
          delete result[0].password;
          res.status(200).send({
            user: result[0],
          });
        }
      }
    );
  } catch (err) {
    return res.status(400).send({ error: "Please Authenticate!" });
  }
});

module.exports = router;
