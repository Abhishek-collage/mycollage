
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const hbs = require('hbs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
const templet_path = path.join(__dirname, "Templetes/views");
const Partial_path = path.join(__dirname, "Templetes/partials");
app.set('view engine', 'hbs');
app.set('views', templet_path);
hbs.registerPartials(Partial_path);

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/Project', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

// Schema
const EmploySchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone: {
        type: String
    },
    password: {
        type: String, // Assuming password is a string, not a number
    },
    conformPassword: {
        type: String, // Assuming conformPassword is a string, not a number
    },
    tokens:[{
        token:{
            type:String,
            required:true,
        }
    }]
  
});

EmploySchema.methods.generateToken = async function(){
    try{
        const token = jwt.sign({_id:this._id.toString()},process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token:token});
        await this.save();
        return token;

    }catch(err){
res.send("this is a internal err"+err);
    }
}


EmploySchema.pre("save", async function(next){
    if(this.isModified('password')){

        this.password = await bcrypt.hash(this.password, 10);

        this.conformPassword = await bcrypt.hash(this.password, 10);
    }


next();

})
const Usermodel = mongoose.model("users", EmploySchema);

// Routes
// Home page route
app.get('/', async (req, res) => {
    try {
        const users = await Usermodel.find();
        res.render('index', { users });  // Render index.hbs with users data
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Registration form route (GET)
app.get('/register', (req, res) => {
    res.render("register");
});

// Registration form submission route (POST)
app.post('/register', async (req, res) => {
    const { password, conformPassword } = req.body;
    if (password === conformPassword) {
        try {
            const newUser = new Usermodel({
                firstname: req.body.firstname,
                email: req.body.email,
                address: req.body.address,
                phone: req.body.phone,
                password: req.body.password,
                conformPassword: req.body.conformPassword,
            });

          
  const token =  await newUser.generateToken();
            const savedUser = await newUser.save();
       
            res.status(201).render("index");
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.send("Password is not matching");
    }
});
app.get("/login", (req, res)=>{
    res.render("login")
})

app.post('/login', async(req, res) => {

 try{
const email = req.body.email;
const password = req.body.password;
 const useremail = await Usermodel.findOne({email:email});
 const isMatch = await bcrypt.compare(password, useremail.password);
 const token =  await useremail.generateToken();

if(isMatch){
   return res.status(201).render("index");
}else{
    res.send('password are not matching');
}

 }catch(err){
    res.status(400).send('invalid email');
 }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

