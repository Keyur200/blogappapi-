const mongoose = require('mongoose');
const {ObjectId,Date} = mongoose.Schema.Types;

const PostSchema = new mongoose.Schema({
    title:String,
    summary:String,
    content:String,
    cover:String,
    likes:[{type: ObjectId, ref:"User"}],
    dislikes:[{type: ObjectId, ref:'User'}],
    comments:[{text:String,created: new Date(), postedBy:{type: ObjectId, ref:'User'}}],
    author:{type:ObjectId, ref:'User'},
},{
    timestamps:true,
})

const PostModel = mongoose.model('Post', PostSchema);

module.exports = PostModel;