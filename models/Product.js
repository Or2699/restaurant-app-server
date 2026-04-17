import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name : { he : { type : String , required : true } , en : { type : String , required : true } } , //תמיכה בשפות
    description : { he: { type: String, required: true }, en: { type: String, required: true }} , // תיאור המנה - תמיכה בעברית ואנגלית
    price : { type: Number, required: true } ,
    image : { type: String } , // url למנה 
    category : { type : String , enum: ['starters', 'main', 'desserts', 'drinks'] , required: true} ,
    isAvailable: { type: Boolean , default: true } , // האם המנה קיימת כרגע במטבח
    tags: [String] , // תגיות נוספות (למשל: 'חריף', 'טבעוני', 'ללא גלוטן')
    createdAt: { type: Date, default: Date.now }
});


const Product = mongoose.model('Product' , productSchema); 

export default Product; //ייצוא 
