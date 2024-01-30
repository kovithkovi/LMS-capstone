/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const path = require("path");
const { Course, Chapter, Page } = require("./models");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Define GET and POST routes for "/educator"
app.get("/educator", async (request, response) => {
  response.render("educator.ejs");
});

// Define GET and POST routes for "/course"
app.get("/course", async (request, response) => {
  try {
    const courses = await Course.getCourse();
    if (request.accepts("html")) {
      response.render("createNewCourse", {
        courses,
      });
    } else {
      response.json({
        courses,
      });
    }
  } catch (err) {
    console.error(err);
    response.status(500).send("Internal Server Error");
  }
});

app.post("/course", async (request, response) => {
  try {
    console.log("Request Body:", request.body.name);
    const course = request.body.name;
    await Course.addCourse(course);
    // Redirect to "/chapter" without passing data
    response.redirect("/chapter");
  } catch (err) {
    console.error(err);
    response.status(500).json(err);
  }
});

// Define GET route for "/chapter" at the top level
app.get("/chapter", async (request, response) => {
  try {
    // Retrieve course data or pass it in some way
    const course = "someCourseName"; // Replace with the actual course data
    const chapters = await Chapter.getChapters();
    response.render("Chapter", {
      course,
      chapters,
    });
  } catch (err) {
    console.error(err);
    response.status(500).send("Internal Server Error");
  }
});

app.get("/chapter/new", async (request, response) => {
  const chapters = await Chapter.getChapters();
  if (request.accepts("html")) {
    response.render("createNewChapter", {
      chapters,
    });
  } else {
    response.json({
      chapters,
    });
  }
});

app.post("/chapter/new", async (request, response) => {
  try {
    await Chapter.addChapter({
      cname: request.body.cname,
      description: request.body.description,
    });
  } catch (err) {
    console.log(err);
  }
});
module.exports = app;
