import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
console.log({
    user: process.env.auser,
    host: process.env.ahost,
    database : process.env.adatabase,
    password: process.env.apassword,
    port: process.env.aport,
})

const app=express();
const port =3000;


const db=new pg.Client({
  user: process.env.auser,
  host: process.env.ahost,
  database : process.env.adatabase,
  password: process.env.apassword,
  port: process.env.aport,
})

db.connect();

app.use(session({
    secret: process.env.session_secret,
    resave:false,
    saveUninitialized:true,
    cookie:{maxAge:60000}
}));

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

function isAuthenicated(req,res,next){
    if(req.session.username){
        next();
    }
    else{
        res.redirect("/");
    }
}

app.get("/",(req,res)=>{
    res.render("index.ejs");
});

app.get("/login",(req,res)=>{
    
    res.render("login.ejs",{message:""});
})

app.get("/register",(req,res)=>{
   
    res.render("register.ejs",{message:""});
})

app.get("/home",isAuthenicated, async (req,res)=>{
    var posts=await db.query("SELECT * FROM messages");
    var testUser=req.session.username;
    res.render("home.ejs",{blogs:posts,un:testUser});
})

app.post("/profile",async (req,res)=>{
    var user= req.body.wantProfile;
    var head= await db.query("SELECT * FROM users WHERE username=$1",[user]);
    var sendinfo=head.rows[0];
    res.render("profile.ejs",{info:sendinfo})

})

app.post("/delete",async (req,res)=>{
    var id=req.body.delid;
    var text=await db.query("SELECT * FROM messages WHERE id=$1",[id]);
    var messages=text.rows[0];
    return res.render("delete.ejs",{message:messages})
})


app.post("/register",async (req,res)=>{
    var enterfname=req.body["fname"];
    var enterlname=req.body["lname"];
    var enteruser=req.body["username"];
    var enterpass=req.body["password"];
    var entervpass=req.body["password"];
    var checkU=await db.query("SELECT * FROM users WHERE username=$1",[enteruser]);
    if(enterfname.trim()==="" || enterlname.trim()==="" || enteruser.trim()==="" || enterpass.trim()===""){
        res.render("register.ejs",{message:"you may left some fields empty.please fill all the information"});
    }
    else if(enterpass!==entervpass){
        res.render("register.ejs",{message:"password verification failed. verify your password correctly"})
    }
    
    else if(checkU.rows.length>0){
        res.render("register.ejs",{message:"username already exists.try using another name or try to login"});
    }
    else {
        const saltRounds=10;
        const salt= await bcrypt.genSalt(saltRounds);
        const hashedpass= await bcrypt.hash(enterpass,salt);
        await db.query("INSERT INTO users(username,passwordu,fname,lname) VALUES($1,$2,$3,$4)",[enteruser,hashedpass,enterfname,enterlname]);
        return res.render("regcomplete.ejs");
        req.session.username=enteruser;
    }
})

app.post("/login",async (req,res)=>{
   try{ var enterUser=req.body["username"];
    var enterPass=req.body["password"];
    var infoOfUser=await db.query('SELECT * FROM users WHERE username=$1',[enterUser]);
    if(infoOfUser.rows.length===0){
        return res.render("login.ejs",{message:"no user exists with the username"});
    }
    var hashedOne=infoOfUser.rows[0].passwordu;
    const isSame= await bcrypt.compare(enterPass,hashedOne);

    if(isSame){
        req.session.username=enterUser;
         return res.redirect("/home");
        
    }
    else{
         return res.render("login.ejs",{message:"incorrect password"});
    }}
    catch{
        console.error(error);
        return res.status(500).send("internal server error");
    }
})

app.post("/send", async (req,res)=>{
       var user=req.session.username;
       var enteredText=req.body["userpost"];
       if(enteredText.trim()===""){
        return res.redirect("/home")
       }
       var nickname=await db.query("SELECT * FROM users WHERE username=$1",[user]);
       var calln=nickname.rows[0].fname;
       await db.query("INSERT INTO messages (username,post,nickname) VALUES($1,$2,$3)",[user,enteredText,calln]);
      res.redirect("/home");
})

app.post("/logout", async (req,res)=>{
    req.session.destroy(err =>{
        if(err){
            return res.render('logout.ejs',{message:"error logging out"});
        }
        res.clearCookie('connect.sid');
        res.render('logout.ejs',{message:"you are logged out successfully"});
    })
})

app.post("/confirmDelete",async (req,res)=>{
    
    var ourId=req.body.sure;
    await db.query("DELETE FROM messages WHERE id=$1",[ourId]);
    return res.redirect("/home");
})

app.post("/delete",async(req,res)=>{
    var deid=req.body.delid;
    var info=await db.query("SELECT * FROM messages WHERE id=$1",[deid]);
    return res.render("delete.ejs",{message:info});
})

app.get("/forget",(req,res)=>{
    return res.render("forget.ejs");
})


app.post("/out",(req,res)=>{
    res.redirect("/");
})

app.listen(port,()=>{
    console.log("Running on port "+port);
})