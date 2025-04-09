if(process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const app = express();
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require("./utils/ExpressError.js");//Express Error

const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

 const dburl =  process.env.ATLASDB_URL
main().then(() => {
  console.log("Db is connected");
}).catch((ex) => {
  console.log(ex);
});

//databases
async function main() {
  await mongoose.connect(dburl);
}


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


const store = MongoStore.create({
  mongoUrl: dburl,
  crypto:{
    secret:process.env.SECRETE,
  },
  touchAfter: 24 * 3600,
});

store.on("error", () =>{
   console.log("ERROR in MONGO SESSION STORE,",err);
})

const sessionOptions = {
  store,
  secret: process.env.SECRETE,
  resave: false,
  saveUninitialized:true,
  Cookie:{
    expires:Date.now() + 7 * 24 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 1000,
    httpOnly:true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
  res.locals.success = req.flash("success"); 
  res.locals.error = req.flash("error"); 
  res.locals.currUser = req.user;
  next(); 
});


//listings --route
app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/", userRouter);

//err when route not match 
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Note Found !"));
});


//middleware error handling
app.use((err, req, res, next) => {
  let { statusCode = 500, message = " Something went wrong..."} = err;
  res.status(statusCode).render("error.ejs", { message });

});


app.listen(port, (req, res) => {
  console.log("app is listing");
});


