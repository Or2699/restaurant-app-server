import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId,  ref: 'User', required: true } ,  // הלקוח או המלצר שביצעו את ההזמנה
    items: [  // רשימת המנות שהוזמנו
        {
            product: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Product',
                required: true
            },
            quantity: { 
                type: Number, 
                default: 1 
            },
            notes: { 
                type: String // למשל: "בלי בצל", "מידת עשייה M"
            }
        }
    ] , 
    totalPrice: { type: Number, required: true } ,
    tableNumber: { type: Number , required: true } ,
    status: { type: String, enum: ['pending', 'preparing', 'served', 'paid', 'cancelled'], default: 'pending' } ,  // ניהול מצב ההזמנה (חשוב למלצר ולמטבח)
    createdAt: { type: Date, default: Date.now } , // תאריך ההזמנה אוטומטית
    paymentMethod: { 
        type: String, 
        enum: ['Cash', 'Credit Card', 'Apple Pay'], 
        default: 'Cash' 
    },
    isPaid: { 
        type: Boolean, 
        default: false 
    },
    paidAt: { 
        type: Date 
}
});

const Order = mongoose.model('Order', orderSchema);
export default Order;