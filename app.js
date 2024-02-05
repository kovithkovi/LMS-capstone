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
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const { ppid } = require("process");

const saltRounds = 10;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(cookieParser());
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT"]));
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
  response.render("login", {
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/changepassword",
  connectEnsureLogin.ensureLoggedIn(),
  async (requset, response) => {
    response.render("changePassword", {
      csrfToken: requset.csrfToken(),
    });
  }
);

app.post(
  "/changepassword",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const user = await User.getUser(request.user.id);
    const oldPassword = request.body.oldPassword;
    const passwordsMatch = await bcrypt.compare(oldPassword, user.password);
    if (passwordsMatch) {
      const hasedPwd = await bcrypt.hash(request.body.password, saltRounds);
      await user.updatePassword(hasedPwd);
      if (user.admin == true) {
        response.redirect("/educator");
      }
      response.redirect("/learner");
    }
    console.log("Wrong Password");
  }
);

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
  response.render("signup.ejs", {
    csrfToken: request.csrfToken(),
  });
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
      if (!request.user.admin) {
        return response.redirect("/learner");
      }
      const userId = request.user.id;
      const Availablecourse = await Course.getAvailable(userId);
      const enrollCourses = await Course.getEnroll(userId);
      const userName = request.user.firstName;
      console.log(enrollCourses);
      const totalPageCounts = await Promise.all(
        enrollCourses.map(async (course) => {
          return {
            courseId: course.id,
            totalPageCount: await Page.getTotalPagesForCourse(course.id),
          };
        })
      );
      console.log(totalPageCounts);

      const completionCounts = await Promise.all(
        enrollCourses.map(async (course) => {
          return {
            courseId: course.id,
            completionCount: await Page.getCompletionCount(course.id, userId),
          };
        })
      );
      const completionPercentages = completionCounts.map((completionCount) => {
        const totalPage = totalPageCounts.find(
          (totalPage) => totalPage.courseId === completionCount.courseId
        );

        if (!totalPage) {
          throw new Error(
            `Total page count not found for courseId: ${completionCount.courseId}`
          );
        }

        const totalPageCount = totalPage.totalPageCount || 0;

        const completionPercentage =
          totalPageCount > 0
            ? (completionCount.completionCount / totalPageCount) * 100
            : 0;

        return {
          courseId: completionCount.courseId,
          completionPercentage,
        };
      });
      console.log(completionCounts);
      console.log(completionPercentages);
      response.render("educator.ejs", {
        Availablecourse,
        enrollCourses,
        userName,
        completionPercentages,
        csrfToken: request.csrfToken(),
      });
    } catch (err) {
      console.log(err);
    }
  }
);

app.get(
  "/mycourses",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const user = await User.getUser(userId);
    const courses = await Course.findAll({
      where: { userId },
    });
    response.render("mycourse", { courses, admin: user.admin });
  }
);
app.get(
  "/educator/reports",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const userId = request.user.id;
      const user = await User.getUser(userId);
      const educatorCourses = await Course.findAll({
        where: { userId },
      });
      const courseReports = await Promise.all(
        educatorCourses.map(async (course) => {
          const enrollmentCount = await Course.getEnrollmentCount(course.id);
          return {
            courseId: course.id,
            courseName: course.name,
            enrollmentCount,
          };
        })
      );
      response.render("report", { courseReports, admin: user.admin });
    } catch (error) {
      console.error("Error fetching enrollment reports:", error);
      response.status(500).send("Internal Server Error");
    }
  }
);

app.put(
  "/course/:courseId/enroll",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const course = await Course.findByPk(request.params.courseId);
    try {
      const enroll = await course.enrolled(userId);
      return response.json(enroll);
    } catch (err) {
      console.log(err);
      return response.status(422).json(error);
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
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          courses,
          csrfToken: request.csrfToken(),
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
        csrfToken: request.csrfToken(),
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
        csrfToken: request.csrfToken(),
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
    const page = await Page.getPage(request.params.pageId);
    const pages = await Page.findAll({ where: { chapterId: page.chapterId } });
    const users = await User.findByPk(request.user.id);
    const noPages = pages.length;
    console.log("No.of pages ****88", noPages);
    const completecheck = await Page.completeCheck(
      request.user.id,
      request.params.pageId
    );
    response.render("displayPages", {
      id: page.id,
      title: page.title,
      content: page.content,
      completed: completecheck,
      noPages,
      chapterId: page.chapterId,
      admin: users.admin,
      csrfToken: request.csrfToken(),
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
      const complete = await page.markAsCompleted(userId);
      return response.json(complete);
    } catch (err) {
      console.log(err);
      return response.status(422).json(error);
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

    const totalPageCounts = await Promise.all(
      enrollCourses.map(async (course) => {
        return {
          courseId: course.id,
          totalPageCount: await Page.getTotalPagesForCourse(course.id),
        };
      })
    );

    const completionCounts = await Promise.all(
      enrollCourses.map(async (course) => {
        return {
          courseId: course.id,
          completionCount: await Page.getCompletionCount(course.id, userId),
        };
      })
    );

    const completionPercentages = completionCounts.map((completionCount) => {
      const totalPageCount =
        totalPageCounts.find(
          (totalPage) => totalPage.courseId === completionCount.courseId
        )?.totalPageCount || 0;

      const completionPercentage =
        totalPageCount > 0
          ? (completionCount.completionCount / totalPageCount) * 100
          : 0;
      return {
        courseId: completionCount.courseId,
        completionPercentage,
      };
    });

    response.render("Learner", {
      Availablecourse,
      enrollCourses,
      userName,
      completionPercentages,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/courseView/:Id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const course = await Course.findByPk(request.params.Id);
    const chapters = await Chapter.getChaptersRespective(request.params.Id);
    const users = await User.findByPk(request.user.id);
    response.render("courseView", {
      courseName: course.name,
      chapters,
      courseId: request.params.Id,
      admin: users.admin,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get("/makeadmin", async (request, response) => {
  const user = await User.findByPk(3);
  user.makeadmin();
});

module.exports = app;
