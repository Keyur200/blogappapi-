const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const User = require('./model.js');
const Post = require('./PostModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddelware = multer({ 'dest': 'uploads/' })
const fs = require('fs');
const dotenv = require('dotenv')
const { error } = require('console');

const app = express();
app.use(cors({  origin: ["https://blogapp-gdn9.vercel.app"], methods: ["GET","POST","PUT","DELETE"], credentials: true,}));
app.use(express.json());
app.use(cookieParser());
dotenv.config()
app.use('/uploads', express.static(__dirname + '/uploads'))

const salt = bcrypt.genSaltSync(10);

mongoose.connect(process.env.MONGO_URL);


app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userDoc = await User.create({ username, password: bcrypt.hashSync(password, salt) });
        res.json(userDoc);
    } catch (e) {
        res.status(400).json(e);
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });
    if (!userDoc) {
        return res.json({ msg: "Incorrect Username or Password", status: false })
    } else {
        const passCheck = bcrypt.compareSync(password, userDoc.password);
        if (!passCheck) { return res.json({ msg: "Incorrect Username or Password", status: false }); }

        if (passCheck) {
            jwt.sign({ username, id: userDoc._id }, process.env.SECRET, {}, (err, token) => {
                if (err) res.json(err);
                res.cookie('token', token,{
                    httpOnly: true,
                    sameSite: "none",
                    secure: true,}).json('ok');
            })
            if (!username && !passCheck) {
                res.json({ msg: "Incorrect Username or Password", status: false });
            }
        } else {
            res.status(400).json("Wrong Credentials");
        }
    }

})

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, process.env.SECRET, {}, (err, info) => {
        if (err) throw err;
        res.json(info);
    })
})

app.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        sameSite: "none",
        secure: true,}).json("ok")
})


app.post('/post',  async (req, res) => {

    const { token } = req.cookies;
    jwt.verify(token, process.env.SECRET, {}, async (err, info) => {
        if (err) throw err;
        const { title, content, summary, pic } = req.body;
        const postDoc = await Post.create({
            title, summary, content, cover: pic, author: info.id
        });
        res.json(postDoc)
    })
})


app.get('/post', async (req, res) => {
    res.json(await Post.find()
        .populate('author', ['username'])
        .populate('comments.postedBy', '_id username')
        .sort({ createdAt: -1 })
        .limit(20)
    );
})

app.get('/post/:id', async (req, res) => {
    const { id } = req.params;

    const postDoc = await Post.findById(id).populate('author', ['username']).populate('comments.postedBy', 'id username');
    return res.json(postDoc);
})


app.put('/comment', (req, res) => {
    try {
        const { token } = req.cookies;
        if (token) {

            jwt.verify(token, process.env.SECRET, {}, async (err, info) => {
                if (err) throw err;
                const comment = {
                    text: req.body.text,
                    postedBy: info.id,
                    created: new Date()
                }
                Post.findByIdAndUpdate(req.body.postId, {
                    $push: { comments: comment }
                }, { new: true }
                )
                    .populate('postedBy', 'id username')
                    .sort('created')
                    .exec((err, result) => {
                        if (err) {
                            return res.status(400).json({ error: err })
                        } else {
                            return res.json(result)
                        }
                    })
            })

        } else {
            return res.json({ error: "Please login first" })
        }

    } catch (error) {
        res.json({ error: "Please login." })
    }

})

app.put('/like', (req, res) => {
    const { token } = req.cookies;
    if (token) {
    jwt.verify(token, process.env.SECRET, {},  (err, info) => {
        if (err) throw err;
         Post.findByIdAndUpdate(req.body.postId, {
            $addToSet: { likes: info.id },
            $pull: { dislikes: info.id },
        }, { new: true }
        ).exec((err, result) => {
            if (err) {
                return res.status(400).json({ error: err })
            } else {
                return res.json(result)
            }
        })
    })
}else{
    res.json({error: "Please login first."})
}
})
app.put('/dislike', (req, res) => {
    const { token } = req.cookies;
    if (token) {
    jwt.verify(token, process.env.SECRET, {},  (err, info) => {
        if (err) throw err;
         Post.findByIdAndUpdate(req.body.postId, {
            $addToSet: { dislikes: info.id },
            $pull: { likes: info.id },
        }, { new: true }
        ).exec((err, result) => {
            if (err) {
                return res.status(400).json({ error: err })
            } else {
                res.json(result)
            }
        })

    })
}else{
    res.json({error:"Please login first."})
}
})

app.listen(process.env.PORT);