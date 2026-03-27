const express = require('express');

const app = express();

app.use(express.json());

//example endpoint
app.get('/users', (req, res) => {
    res.json({
        message: 'Users fetched successfully',
        data: ['user1', 'user2', 'user3']
    });
});

//simulate delay endpoint
app.get('/slow', (req, res) => {
    setTimeout(() => {
        res.json({
            message: 'Slow response'
        });
    }, 3000);
});

//simulate error
app.get('/error', (req, res) => {
    res.status(500).json({ error : 'Backend error' });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Backend is running on port ${PORT}`);
});