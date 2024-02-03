/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const path = require("path");
const { Course, Chapter, Page, User } = require("./models");
const course = require("./models/course");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");

const saltRounds = 10;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  req.User = req.user; // Assuming your authentication middleware sets the user on req.user
  next();
});
app.use(
  session({
    secret: "my-super-secret-key-46464654565402",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done("Invalid Password");
          }
        })
        .catch((err) => {
          return err;
        });
    }
  )
);
passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});
app.get("/", async (request, response) => {
  response.render("index.ejs");
});

app.get("/login", async (request, response) => {
  response.render("login");
});

app.get("/changepassword", async (requset, response) => {
  response.render("changePassword");
});

app.post("/changepassword", async (request, response) => {
  const user = await User.getByEmail(request.body.email);
  console.log(user);
  const hasedPwd = await bcrypt.hash(request.body.password, saltRounds);
  await user.updatePassword(hasedPwd);
  response.redirect("/login");
});

app.post(
  "/session",
  passport.authenticate("local", { failureRedirect: "/" }),
  async (request, response) => {
    if (request.user.admin) {
      response.redirect("/educator");
    } else {
      response.redirect("/learner");
    }
  }
);
app.get("/signup", async (request, response) => {
  response.render("signup.ejs");
});

app.get("/signout", async (request, response) => {
  request.logOut((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});
app.post("/user", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/learner");
    });
  } catch (err) {
    console.log(err);
  }
});
// Define GET and POST routes for "/educator"
app.get(
  "/educator",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      // Check if the user is an educator
      if (!request.user.admin) {
        // If not an educator, redirect to learner dashboard or another appropriate page
        return response.redirect("/learner");
      }
      const userId = request.user.id;
      // console.log(request.user);
      const Availablecourse = await Course.getAvailable(userId);
      const enrollCourses = await Course.getEnroll(userId);
      // const enrollCourses = User.(userId);

      const userName = request.user.firstName;
      console.log(userName);
      response.render("educator.ejs", {
        Availablecourse,
        enrollCourses,
        userName,
      });
    } catch (err) {
      console.log(err);
    }
  }
);

app.put(
  "/course/:courseId/enroll",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log(request.params.courseId);
    const userId = request.user.id;
    const course = await Course.findByPk(request.params.courseId);
    console.log(course);
    try {
      await course.enrolled(userId);
    } catch (err) {
      console.log(err);
    }
  }
);
// Define GET and POST routes for "/course"
app.get(
  "/course",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
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
  }
);

app.post("/course", async (request, response) => {
  try {
    // console.log("Request Body:", request.body.name);
    const course = request.body.name;
    // console.log(course);
    const userId = request.user.id;
    console.log("userID", userId);
    const newCourse = await Course.addCourse(course, userId);
    response.redirect(`/chapter/${newCourse.id}`);
  } catch (err) {
    console.error(err);
    response.status(500).json(err);
  }
});

// Define GET route for "/chapter" at the top level
app.get(
  "/chapter/:courseId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const userId = request.user.id;
      const admin = request.user.admin;
      const courseId = request.params.courseId;
      const course = await Course.findByPk(courseId, {
        where: { userId: userId },
      });
      // console.log(course);
      const chapters = await Chapter.getChaptersRespective(courseId);
      response.render("Chapter", {
        courseName: course.name,
        chapters,
        courseId,
        admin,
      });
    } catch (err) {
      console.error(err);
      response.status(500).send("Internal Server Error");
    }
  }
);

app.get(
  "/Newchapter/:courseId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
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
  }
);

app.post(
  "/Newchapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
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
  }
);

app.get(
  "/pages/:chapterId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const admin = request.user.admin;
      const chapterId = await request.params.chapterId;
      const chapter = await Chapter.getChapter(chapterId);
      const pages = await Page.getPagesRespective(chapterId);
      console.log(pages);
      response.render("Pages", {
        chapterName: chapter.Cname,
        pages,
        chapterId,
        admin,
      });
    } catch (err) {
      console.log(err);
    }
  }
);

app.get(
  "/Newpage/:chapterId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const chapterId = request.params.chapterId;
      console.log(chapterId);
      response.render("createNewPage", {
        chapterId,
      });
    } catch (err) {
      console.log(err);
    }
  }
);

app.post(
  "/Newpages",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
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
  }
);

app.get(
  "/page/:pageId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // console.log(request.params.pageId);
    const page = await Page.getPage(request.params.pageId);
    const pages = await Page.findAll({ where: { chapterId: page.chapterId } });
    const noPages = pages.length;
    console.log("No.of pages ****88", noPages);
    const completecheck = await Page.completeCheck(
      request.user.id,
      request.params.pageId
    );
    // console.log(page.isCompleted);
    response.render("displayPages", {
      id: page.id,
      title: page.title,
      content: page.content,
      completed: completecheck,
      noPages,
    });
  }
);

app.put(
  "/pages/:pageId/markAsCompleted",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    try {
      const page = await Page.getPage(request.params.pageId);
      await page.markAsCompleted(userId);
    } catch (err) {
      console.log(err);
    }
  }
);

app.get(
  "/learner",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const Availablecourse = await Course.getAvailable(userId);
    const enrollCourses = await Course.getEnroll(userId);
    const userName = request.user.firstName;
    response.render("Learner", {
      Availablecourse,
      enrollCourses,
      userName,
    });
  }
);

app.get(
  "/courseView/:Id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const course = await Course.findByPk(request.params.Id);
    console.log(course);
    const chapters = await Chapter.getChaptersRespective(request.params.Id);
    response.render("courseView", {
      courseName: course.name,
      chapters,
      courseId: request.params.Id,
    });
  }
);

app.get("/makeadmin", async (request, response) => {
  const user = await User.findByPk(2);
  user.makeadmin();
});

module.exports = app;
