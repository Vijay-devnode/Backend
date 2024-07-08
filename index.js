import express from 'express'
import bcryptjs from 'bcrypt'
import jwt from 'jsonwebtoken'
import userModel from './models/user.js'
import cookieParser from 'cookie-parser'
import  connect  from './dbconfig/index.js'
import postModel from './models/post.js'
connect()
const app = express()
app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())


app.post("/signup",async function(req,res){
  const {username,email,password} = req.body;
  const user = await userModel.findOne({email})
  if(user){
    return res.send("already exsists")
  }
  const salt = await bcryptjs.genSalt(10)
  const hash = await bcryptjs.hash(password,salt)
  const opuser = await userModel.create({
    email,
    password: hash,
    username,
  })
  await opuser.save()

  const token =  jwt.sign({email:email,username:username},"oppie")
  res.cookie("token",token)
  res.redirect("/profile")
})
app.get("/login",(req,res)=>{
  res.render('login')
})
app.post("/post",authorizeduser,async(req,res)=>{
  let user = await userModel.findOne({email: req.user.email})
  const {post} = req.body;
  const postdata = new postModel({
    user: user._id,
    post,
  });

  await postdata.save();
  user.posts.push(postdata._id);
  await user.save();
  res.redirect("/profile")
})

app.post("/loginuser",async(req,res)=>{
  const {username,password} = req.body;
  const user = await userModel.findOne({username})
  if(!user){
    res.redirect("/signin")
  }
  else{
    const correctpassword = await bcryptjs.compare(password,user.password)
    if (correctpassword) {
      const token =  jwt.sign({username:username,email:user.email},"oppie")
        res.cookie("token",token)
        res.redirect("/profile")
    }
    else{
      res.send("password is wrong")
    }
  }
})

app.get("/signin",(req,res)=>{
  res.render("signup")
})
app.get("/like/:id",authorizeduser,async (req,res)=>{
   const postlike = await postModel.findOne({_id: req.params.id}).populate("user")
   const user = await userModel.findOne({username: req.user.username})
    
    if (postlike.likes.indexOf(user._id) === -1) {
      postlike.likes.push(user._id) 
    }
    else{
      postlike.likes.splice(postlike.likes.indexOf(user._id),1)
    }
    await postlike.save()
  res.redirect("/profile")
})

app.get("/edit/:id",async(req,res)=>{
  const post = await postModel.findByIdAndUpdate({_id: req.params.id})
  res.render("Edit",{post})
})
app.post("/update/:id",async(req,res)=>{
  const post = await postModel.findByIdAndUpdate({_id: req.params.id},{post: req.body.post})
  res.redirect("/profile")
})

app.get("/logout",(req,res)=>{
  res.cookie("token","")
  res.redirect("/login")
})
app.get("/delete/:id",async(req,res)=>{
  const post = await postModel.findByIdAndDelete({_id: req.params.id})
  res.redirect("/profile")
})

app.get("/profile",authorizeduser,async(req,res)=>{
  const user = await userModel.findOne({email: req.user.email}).populate("posts")
  res.render("HOME",{user})
})

function authorizeduser(req,res,next){
  if (req.cookies.token === "") {
    res.redirect("/login")
  }
  else{
    let data =jwt.verify(req.cookies.token,"oppie")
    req.user = data;
    next()
  }
}

app.get("/home",authorizeduser,async(req,res)=>{
  const post = await postModel.find().populate("user")
  let data = jwt.verify(req.cookies.token,"oppie")
  req.user = data;
  res.render("main",{post})
})

app.get("/likes/:id",authorizeduser,async (req,res)=>{
  const postlike = await postModel.findOne({_id: req.params.id}).populate("user")
  const user = await userModel.findOne({username: req.user.username})
   
   if (postlike.likes.indexOf(user._id) === -1) {
     postlike.likes.push(user._id) 
   }
   else{
     postlike.likes.splice(postlike.likes.indexOf(user._id),1)
   }
   await postlike.save()
 res.redirect("/home")
})

app.listen(3000,()=>{
  console.log("this is running on 3000");
})