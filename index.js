const express = require('express');
const cors = require('cors');
require("dotenv").config();
const app = express()
const port = process.env.PORT || 3200;

//middleware
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174",],
    credentials: true,
    optionSuccessStatus: 200,
}))
app.use(express.json())



app.get('/', (req, res)=>{
    res.send('ClassEdge is running')
})
app.listen(port, ()=>{
    console.log('ClassEdge is running on port: ', port)
})