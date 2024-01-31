/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const path = require("path");
const { Course, Chapter, Page } = require("./models");
const course = require("./models/course");

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
    console.log(course);
    const newCourse = await Course.addCourse(course);
    response.redirect(`/chapter/${newCourse.id}`);
  } catch (err) {
    console.error(err);
    response.status(500).json(err);
  }
});

// Define GET route for "/chapter" at the top level
app.get("/chapter/:courseId", async (request, response) => {
  try {
    const courseId = request.params.courseId;
    const course = await Course.findByPk(courseId);
    const chapters = await Chapter.getChaptersRespective(courseId);
    response.render("Chapter", {
      courseName: course.name,
      chapters,
      courseId,
    });
  } catch (err) {
    console.error(err);
    response.status(500).send("Internal Server Error");
  }
});

app.get("/Newchapter/:courseId", async (request, response) => {
  const courseId = request.params.courseId;
  // const chapters = await Chapter.getChaptersRespective(courseId);
  // console.log(courseId);
  if (request.accepts("html")) {
    response.render("createNewChapter", {
      courseId,
    });
  } else {
    response.json({
      courseId,
    });
  }
});

app.post("/Newchapter", async (request, response) => {
  try {
    const courseid = request.body.courseId;
    console.log(request.body.cName);
    console.log(request.body.description);
    console.log(courseid);
    await Chapter.addChapter(
      request.body.cName,
      request.body.description,
      courseid
    );
    response.redirect(`/chapter/${courseid}`);
  } catch (err) {
    console.log(err);
  }
});

app.get("/pages/:chapterId", async (request, response) => {
  try {
    const chapterId = await request.params.chapterId;
    const chapter = await Chapter.getChapter(chapterId);
    const pages = await Page.getPagesRespective(chapterId);
    console.log(pages);
    response.render("Pages", { chapterName: chapter.Cname, pages, chapterId });
  } catch (err) {
    console.log(err);
  }
});

app.get("/Newpage/:chapterId", async (request, response) => {
  try {
    const chapterId = request.params.chapterId;
    console.log(chapterId);
    response.render("createNewPage", {
      chapterId,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/Newpages", async (request, response) => {
  try {
    await Page.addPages(
      request.body.title,
      request.body.content,
      request.body.chapterId
    );
    response.redirect(`/pages/${request.body.chapterId}`);
  } catch (err) {
    console.log(err);
  }
});

module.exports = app;
